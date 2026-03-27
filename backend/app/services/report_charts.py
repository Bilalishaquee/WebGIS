"""Matplotlib figures for PDF export (maps, charts)."""
from __future__ import annotations

import io
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


_PIE_DPI = 200


def pie_chart_bytes(labels: list[str], sizes: list[float], colors_hex: list[str]) -> io.BytesIO:
    fig, ax = plt.subplots(figsize=(5.5, 4))
    ax.pie(
        sizes,
        labels=labels,
        autopct="%1.1f%%",
        colors=colors_hex,
        textprops={"fontsize": 9},
        wedgeprops={"edgecolor": "white", "linewidth": 1},
    )
    ax.set_title("Water demand by land use (yearly)", fontsize=11, fontweight="bold", pad=10)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=_PIE_DPI, bbox_inches="tight", facecolor="#fafafa")
    plt.close(fig)
    buf.seek(0)
    return buf


def forecast_chart_bytes(
    years_x: list[int],
    y90: list[float],
    y100: list[float],
    growth_pct: float,
    horizon: int,
) -> io.BytesIO:
    fig, ax = plt.subplots(figsize=(6.5, 4))
    ax.plot(years_x, [v / 1e6 for v in y90], "o-", color="#2563eb", linewidth=2, label="0.09 m³/c", markersize=4)
    ax.plot(years_x, [v / 1e6 for v in y100], "s-", color="#059669", linewidth=2, label="0.1 m³/c", markersize=4)
    ax.set_xlabel("Year index (0 = current)", fontsize=10)
    ax.set_ylabel("Yearly demand (thousand m³)", fontsize=10)
    ax.set_title(f"Demand forecast ({growth_pct}% growth / year, {horizon}-year horizon)", fontsize=11, fontweight="bold")
    ax.legend(loc="upper left", framealpha=0.95)
    ax.grid(True, alpha=0.3)
    ax.set_facecolor("#fafafa")
    fig.patch.set_facecolor("white")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf


LAND_USE_COLORS = {
    "Residential": "#3b82f6",
    "Commercial": "#14b8a6",
    "Mixed-use": "#f59e0b",
}
UNKNOWN_COLOR = "#64748b"


def _axis_limits(lats: list[float], lngs: list[float], pad: float = 0.003) -> tuple[tuple[float, float], tuple[float, float]]:
    """Avoid degenerate limits (single point or duplicate coords)."""
    if not lats or not lngs:
        return (-1, 1), (-1, 1)
    lo_lat, hi_lat = min(lats), max(lats)
    lo_lng, hi_lng = min(lngs), max(lngs)
    span_lat = max(hi_lat - lo_lat, 1e-6)
    span_lng = max(hi_lng - lo_lng, 1e-6)
    # Minimum visible span ~0.01 degrees (~1km) so single parcels still show a frame
    min_span = 0.008
    if span_lat < min_span:
        mid = (lo_lat + hi_lat) / 2
        lo_lat, hi_lat = mid - min_span / 2, mid + min_span / 2
    if span_lng < min_span:
        mid = (lo_lng + hi_lng) / 2
        lo_lng, hi_lng = mid - min_span / 2, mid + min_span / 2
    return (lo_lng - pad, hi_lng + pad), (lo_lat - pad, hi_lat + pad)


def _axis_limits_balanced(
    lats: list[float],
    lngs: list[float],
    pad: float = 0.003,
    max_side_ratio: float = 2.0,
) -> tuple[tuple[float, float], tuple[float, float]]:
    """
    After padding, ensure longitude span and latitude span are within max_side_ratio
    of each other. Otherwise set_aspect('equal') collapses the plot into a thin strip
    when parcels span a long north–south corridor (or vice versa).
    """
    (x0, x1), (y0, y1) = _axis_limits(lats, lngs, pad)
    span_x = max(x1 - x0, 1e-9)
    span_y = max(y1 - y0, 1e-9)
    if span_x / span_y > max_side_ratio:
        cy = (y0 + y1) / 2
        new_sy = span_x / max_side_ratio
        y0, y1 = cy - new_sy / 2, cy + new_sy / 2
    elif span_y / span_x > max_side_ratio:
        cx = (x0 + x1) / 2
        new_sx = span_y / max_side_ratio
        x0, x1 = cx - new_sx / 2, cx + new_sx / 2
    return (x0, x1), (y0, y1)


_MAP_DPI = 200


def parcel_map_by_land_use_bytes(points: list[dict[str, Any]]) -> io.BytesIO | None:
    """Scatter plot lat/lng colored by land use (map-style snippet). Always plots all points."""
    if not points:
        return None
    lats = [float(p["lat"]) for p in points]
    lngs = [float(p["lng"]) for p in points]
    uses = [str(p.get("land_use", "")).strip() for p in points]

    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    ax.set_facecolor("#e8eef5")

    plotted = False
    for use, color in LAND_USE_COLORS.items():
        xs = [lngs[i] for i in range(len(lngs)) if uses[i] == use]
        ys = [lats[i] for i in range(len(lats)) if uses[i] == use]
        if xs:
            ax.scatter(
                xs,
                ys,
                c=color,
                label=use,
                s=42,
                alpha=0.9,
                edgecolors="white",
                linewidths=0.4,
                zorder=3,
            )
            plotted = True

    # Unknown / other land-use labels
    other_idx = [i for i, u in enumerate(uses) if u not in LAND_USE_COLORS]
    if other_idx:
        ax.scatter(
            [lngs[i] for i in other_idx],
            [lats[i] for i in other_idx],
            c=UNKNOWN_COLOR,
            label="Other",
            s=42,
            alpha=0.9,
            edgecolors="white",
            linewidths=0.4,
            zorder=3,
        )
        plotted = True

    if not plotted:
        ax.scatter(lngs, lats, c=UNKNOWN_COLOR, s=45, alpha=0.85, edgecolors="white", linewidths=0.4, label="Parcels")

    ax.set_xlabel("Longitude (°)", fontsize=10)
    ax.set_ylabel("Latitude (°)", fontsize=10)
    ax.set_title("Parcel locations by land use", fontsize=12, fontweight="bold", pad=8)
    ax.grid(True, alpha=0.35, linestyle="--", linewidth=0.6)
    ax.legend(loc="best", framealpha=0.92, fontsize=8)
    (x0, x1), (y0, y1) = _axis_limits_balanced(lats, lngs)
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    try:
        ax.set_aspect("equal", adjustable="box")
    except Exception:
        pass
    fig.patch.set_facecolor("white")
    fig.subplots_adjust(left=0.1, right=0.97, top=0.9, bottom=0.14)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=_MAP_DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf


def parcel_map_by_demand_bytes(points: list[dict[str, Any]]) -> io.BytesIO | None:
    """Bubble map: demand (liters) or population fallback when demand is zero."""
    if not points:
        return None
    lats = [float(p["lat"]) for p in points]
    lngs = [float(p["lng"]) for p in points]
    dem = [float(p.get("yearly_liters", 0) or 0) for p in points]
    pop = [int(p.get("population", 0) or 0) for p in points]

    use_pop = not any(d > 0 for d in dem)
    values = [float(pop[i]) if use_pop else dem[i] for i in range(len(points))]
    label = "Population (fallback)" if use_pop else "Yearly demand (liters, model)"
    if not any(v > 0 for v in values):
        values = [1.0] * len(points)  # uniform

    vmax = max(values) or 1.0
    sizes = [22 + 100 * ((v / vmax) ** 0.55) for v in values]

    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    ax.set_facecolor("#f1f5f9")
    sc = ax.scatter(
        lngs,
        lats,
        c=values,
        s=sizes,
        cmap="Blues",
        alpha=0.88,
        edgecolors="#1e3a5f",
        linewidths=0.25,
        zorder=3,
    )
    cb = plt.colorbar(sc, ax=ax, shrink=0.78, pad=0.03, aspect=22)
    cb.set_label(label, fontsize=9)
    ax.set_xlabel("Longitude (°)", fontsize=10)
    ax.set_ylabel("Latitude (°)", fontsize=10)
    title = "Relative intensity (population)" if use_pop else "Relative demand intensity (yearly)"
    ax.set_title(title, fontsize=12, fontweight="bold", pad=8)
    ax.grid(True, alpha=0.35, linestyle="--", linewidth=0.6)
    (x0, x1), (y0, y1) = _axis_limits_balanced(lats, lngs)
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    try:
        ax.set_aspect("equal", adjustable="box")
    except Exception:
        pass
    fig.patch.set_facecolor("white")
    fig.subplots_adjust(left=0.08, right=0.9, top=0.9, bottom=0.14)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=_MAP_DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf
