"""
Multi-page Water Demand PDF report (ReportLab + charts from report_charts).
Page 1: cover band + title + table of contents only (no charts).
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from xml.sax.saxutils import escape

from app.services.report_charts import (
    forecast_chart_bytes,
    parcel_map_by_demand_bytes,
    parcel_map_by_land_use_bytes,
    pie_chart_bytes,
)

W = A4[0]


def _png_flowable(
    buf: io.BytesIO,
    target_width: float,
    max_height: float | None = None,
    hAlign: str = "CENTER",
) -> RLImage:
    """Scale PNG to target width; preserve aspect ratio (avoids stretched maps/charts)."""
    buf.seek(0)
    ir = ImageReader(buf)
    iw, ih = ir.getSize()
    aspect = ih / float(max(iw, 1))
    w = target_width
    h = w * aspect
    if max_height is not None and h > max_height:
        h = max_height
        w = h / aspect
    buf.seek(0)
    return RLImage(buf, width=w, height=h, hAlign=hAlign)


def _fmt_m3(liters: float) -> str:
    m3 = liters / 1000.0
    if m3 >= 1e6:
        return f"{m3 / 1e6:.2f}M m³"
    if m3 >= 1e3:
        return f"{m3 / 1e3:.2f}K m³"
    return f"{m3:.2f} m³"


def _para_block(text: str, style: ParagraphStyle) -> list:
    if not (text or "").strip():
        return []
    safe = escape(text.strip()).replace("\n", "<br/>")
    return [Paragraph(safe, style), Spacer(1, 0.04 * inch)]


def _footer(canvas, doc, muted):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#1d4ed8"))
    canvas.setLineWidth(2)
    canvas.line(0.5 * inch, 0.62 * inch, W - 0.5 * inch, 0.62 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(muted)
    canvas.drawCentredString(W / 2, 0.45 * inch, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_water_demand_report_pdf(data: dict[str, Any], ai_sections: dict[str, str]) -> bytes:
    """
    ai_sections: executive, findings, recommendations, limitations (plain text).
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.58 * inch,
        title="Water Demand Report",
    )

    styles = getSampleStyleSheet()
    brand_blue = colors.HexColor("#1d4ed8")
    brand_light = colors.HexColor("#dbeafe")
    slate = colors.HexColor("#0f172a")
    muted = colors.HexColor("#64748b")

    title_style = ParagraphStyle(
        "T",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=brand_blue,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )
    subtitle = ParagraphStyle(
        "S",
        parent=styles["Normal"],
        fontSize=11,
        textColor=muted,
        alignment=TA_CENTER,
        spaceAfter=10,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=slate,
        spaceBefore=2,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading3"],
        fontSize=11.5,
        textColor=brand_blue,
        spaceBefore=6,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    body = ParagraphStyle(
        "B",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        textColor=slate,
    )
    small = ParagraphStyle("Sm", parent=styles["Normal"], fontSize=8.5, textColor=muted, alignment=TA_CENTER)

    story: list[Any] = []

    # --- Page 1: Cover + TOC only ---
    cover_band = Table(
        [[Paragraph("<b><font color='white'>WATER DEMAND INTELLIGENCE</font></b>", ParagraphStyle("cb", alignment=TA_CENTER, fontSize=9))]],
        colWidths=[6.9 * inch],
    )
    cover_band.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), brand_blue),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(cover_band)
    story.append(Spacer(1, 0.22 * inch))

    story.append(Paragraph("Water Demand Assessment Report", title_style))
    story.append(
        Paragraph(
            "Neighborhood consumption analysis &mdash; scenario-based estimates",
            subtitle,
        )
    )
    gen = data.get("generated_at") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    scenario_label = escape(str(data.get("scenario_label", "")))
    lu = escape(str(data.get("land_use_filter", "All")))
    gr = data.get("growth_rate", 2)
    hy = data.get("horizon_years", 5)
    meta = (
        f"<b>Generated:</b> {escape(gen)} &nbsp;|&nbsp; "
        f"<b>Scenario:</b> {scenario_label} &nbsp;|&nbsp; "
        f"<b>Growth:</b> {gr}% / year &nbsp;|&nbsp; "
        f"<b>Horizon:</b> {hy} years &nbsp;|&nbsp; "
        f"<b>Land use filter:</b> {lu}"
    )
    story.append(Paragraph(meta, ParagraphStyle("Meta", parent=body, alignment=TA_CENTER, fontSize=9)))
    story.append(Spacer(1, 0.26 * inch))

    story.append(Paragraph("<font color='#1d4ed8'><b>Table of Contents</b></font>", ParagraphStyle("TOC", fontSize=16, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=brand_blue, spaceAfter=10)))
    toc_rows = [
        ["#", "Section", "Page"],
        ["1", "Executive summary &amp; detailed AI analysis", "2"],
        ["2", "Key metrics dashboard &amp; highlights", "3"],
        ["3", "Land-use composition &amp; demand share", "4"],
        ["4", "Spatial overview (parcel map snippets)", "5"],
        ["5", "Demand forecast &amp; trajectory", "6"],
        ["6", "Scenario comparison (0.09 vs 0.1 m³/c)", "7"],
        ["7", "Parcel register (sample)", "8"],
        ["8", "Data quality, assumptions &amp; limitations", "9"],
        ["9", "Appendix &amp; report parameters", "10"],
    ]
    toc_table = Table(toc_rows, colWidths=[0.45 * inch, 5.0 * inch, 0.9 * inch])
    toc_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, brand_light]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(toc_table)
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        Paragraph(
            "<i>Page numbers follow this document&rsquo;s print order. Sections include charts, maps, and tables aligned with the web dashboard.</i>",
            small,
        )
    )

    story.append(PageBreak())

    # --- Section 1: AI ---
    exec_t = (ai_sections.get("executive") or "").strip()
    find_t = (ai_sections.get("findings") or "").strip()
    rec_t = (ai_sections.get("recommendations") or "").strip()
    lim_t = (ai_sections.get("limitations") or "").strip()

    story.append(Paragraph("1. Executive summary &amp; detailed AI analysis", h1))
    story.extend(_para_block(exec_t or "Analysis is not available.", body))
    story.append(Paragraph("<b>Key findings</b>", h2))
    story.extend(_para_block(find_t or "—", body))
    story.append(Paragraph("<b>Recommendations</b>", h2))
    story.extend(_para_block(rec_t or "—", body))
    story.append(Paragraph("<b>Scope &amp; limitations (AI)</b>", h2))
    story.extend(_para_block(lim_t or "—", body))
    story.append(
        Paragraph(
            "<i>AI narrative is generated from dashboard metrics and is advisory only.</i>",
            small,
        )
    )

    story.append(PageBreak())

    # --- KPI ---
    story.append(Paragraph("2. Key metrics dashboard &amp; highlights", h1))
    sm = data.get("summary") or {}
    pop = sm.get("population", 0)
    kpi_data = [
        ["Metric", "Value"],
        ["Daily demand (estimated)", _fmt_m3(float(sm.get("daily", 0)))],
        ["Monthly demand (estimated)", _fmt_m3(float(sm.get("monthly", 0)))],
        ["Yearly demand (estimated)", _fmt_m3(float(sm.get("yearly", 0)))],
        ["Population (total)", f"{int(pop):,}"],
    ]
    t = Table(kpi_data, colWidths=[2.5 * inch, 3.7 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.08 * inch))
    story.append(
        Paragraph(
            "<b>Highlights:</b> These KPIs mirror the dashboard cards for the selected per-capita scenario "
            f"({scenario_label}) and land-use filter ({lu}).",
            body,
        )
    )

    story.append(PageBreak())

    # --- Land use ---
    breakdown = data.get("breakdown") or []
    sizes = [float(b.get("consumption", 0) or 0) for b in breakdown]
    labels = [str(b.get("type", "")) for b in breakdown]
    pie_colors = ["#3b82f6", "#14b8a6", "#f59e0b"]

    story.append(Paragraph("3. Land-use composition &amp; demand share", h1))
    rows = [["Land use", "Parcels", "Share (%)", "Yearly demand"]]
    for b in breakdown:
        rows.append(
            [
                str(b.get("type", "")),
                str(b.get("count", "")),
                f"{b.get('percentage', '0')}%",
                _fmt_m3(float(b.get("consumption", 0))),
            ]
        )
    if len(rows) == 1:
        rows.append(["—", "—", "—", "—"])
    t2 = Table(rows, colWidths=[1.45 * inch, 0.95 * inch, 0.95 * inch, 2.85 * inch])
    t2.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t2)
    story.append(Spacer(1, 0.05 * inch))
    if sum(sizes) > 0:
        pie_buf = pie_chart_bytes(labels, sizes, pie_colors[: len(labels)])
        story.append(_png_flowable(pie_buf, 5.5 * inch, max_height=4.0 * inch))

    story.append(Spacer(1, 0.12 * inch))

    # --- Maps (embed land-use and demand figures independently) ---
    story.append(Paragraph("4. Spatial overview (parcel map snippets)", h1))
    pts = data.get("parcel_points") or []
    buf_land = parcel_map_by_land_use_bytes(pts)
    buf_dem = parcel_map_by_demand_bytes(pts)
    map_col_w = 3.05 * inch
    map_max_h = 3.05 * inch
    if buf_land and buf_dem:
        story.append(
            Paragraph(
                "The following figures approximate the dashboard map: <b>left</b> &mdash; parcels colored by land use; "
                "<b>right</b> &mdash; relative intensity (demand, or population when demand is uniform).",
                body,
            )
        )
        story.append(Spacer(1, 0.06 * inch))
        m1 = _png_flowable(buf_land, map_col_w, map_max_h)
        m2 = _png_flowable(buf_dem, map_col_w, map_max_h)
        mt = Table([[m1, m2]], colWidths=[map_col_w, map_col_w])
        mt.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("LEFTPADDING", (1, 0), (1, 0), 22),
                    ("RIGHTPADDING", (0, 0), (0, 0), 6),
                ]
            )
        )
        story.append(mt)
    elif buf_land:
        story.append(
            Paragraph(
                "Parcels colored by land use (demand map could not be generated).",
                body,
            )
        )
        story.append(Spacer(1, 0.06 * inch))
        story.append(_png_flowable(buf_land, 6.5 * inch, max_height=3.75 * inch))
    elif buf_dem:
        story.append(
            Paragraph(
                "Relative intensity map (land-use map could not be generated).",
                body,
            )
        )
        story.append(Spacer(1, 0.06 * inch))
        story.append(_png_flowable(buf_dem, 6.5 * inch, max_height=3.75 * inch))
    else:
        story.append(
            Paragraph(
                "<i>No parcel coordinates in scope; map snippets were skipped.</i>",
                body,
            )
        )

    story.append(PageBreak())

    # --- Forecast ---
    fc = data.get("forecast") or {}
    years_x = list(range(len(fc.get("year90", []))))
    y90 = fc.get("year90") or []
    y100 = fc.get("year100") or []
    story.append(Paragraph("5. Demand forecast &amp; trajectory", h1))
    story.append(
        Paragraph(
            f"Compound growth at <b>{escape(str(gr))}%</b> per year over <b>{escape(str(hy))}</b> years "
            "applied to neighborhood yearly baselines (both per-capita scenarios).",
            body,
        )
    )
    story.append(Spacer(1, 0.06 * inch))
    if years_x and y90 and y100 and len(y90) == len(y100):
        line_buf = forecast_chart_bytes(years_x, y90, y100, float(gr), int(hy))
        story.append(_png_flowable(line_buf, 6.35 * inch, max_height=4.0 * inch))
        story.append(Spacer(1, 0.06 * inch))
        fh = [["Year", "0.09 m³/c (yearly)", "0.1 m³/c (yearly)"]]
        for i in range(len(y90)):
            fh.append([str(i), _fmt_m3(float(y90[i])), _fmt_m3(float(y100[i]))])
        tft = Table(fh, colWidths=[0.85 * inch, 2.45 * inch, 2.45 * inch])
        tft.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(tft)

    story.append(Spacer(1, 0.12 * inch))

    # --- Scenario ---
    story.append(Paragraph("6. Scenario comparison (0.09 vs 0.1 m³/c)", h1))
    sc = data.get("scenario_comparison") or {}
    sct = Table(
        [
            ["Scenario", "Yearly demand (approx.)"],
            ["0.09 m³/c", _fmt_m3(float(sc.get("low", 0)))],
            ["0.1 m³/c", _fmt_m3(float(sc.get("high", 0)))],
            ["Difference (yearly)", _fmt_m3(float(sc.get("diff", 0)))],
        ],
        colWidths=[2.2 * inch, 3.5 * inch],
    )
    sct.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(sct)
    story.append(Spacer(1, 0.06 * inch))
    story.append(
        Paragraph(
            "The higher per-capita scenario (0.1 m³/c) increases total yearly demand versus 0.09 m³/c "
            "assuming identical parcel populations and land-use mix.",
            body,
        )
    )

    story.append(Spacer(1, 0.12 * inch))

    # --- Parcel sample ---
    story.append(Paragraph("7. Parcel register (sample)", h1))
    sample = data.get("parcel_sample") or []
    pr = [["Parcel ID", "Land use", "Population", "Latitude", "Longitude"]]
    for row in sample[:35]:
        pr.append(
            [
                escape(str(row.get("parcel_id", "")))[:18],
                str(row.get("land_use", ""))[:14],
                str(row.get("population", "")),
                f"{float(row.get('lat', 0)):.5f}",
                f"{float(row.get('lng', 0)):.5f}",
            ]
        )
    if len(pr) == 1:
        pr.append(["—", "—", "—", "—", "—"])
    pt = Table(pr, colWidths=[1.1 * inch, 1.1 * inch, 0.85 * inch, 1.1 * inch, 1.1 * inch])
    pt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )
    story.append(pt)
    story.append(Spacer(1, 0.06 * inch))
    story.append(
        Paragraph(
            f"<i>Showing up to 35 of {data.get('parcel_stats', {}).get('total', 0)} parcels in scope.</i>",
            small,
        )
    )

    story.append(Spacer(1, 0.12 * inch))

    # --- Limitations ---
    story.append(Paragraph("8. Data quality, assumptions &amp; limitations", h1))
    story.append(
        Paragraph(
            "<b>Model:</b> Estimates are derived from parcel populations, land-use coefficients, and per-capita "
            "assumptions (0.09 m³/c vs 0.1 m³/c). They do not replace metered consumption or utility billing records.",
            body,
        )
    )
    story.append(Spacer(1, 0.08 * inch))
    story.append(
        Paragraph(
            "<b>Forecast:</b> Growth is applied as a compound annual rate on the neighborhood baseline; "
            "actual urban demand may differ with policy, infrastructure, climate, and behavior changes.",
            body,
        )
    )
    story.append(Spacer(1, 0.08 * inch))
    story.append(
        Paragraph(
            "<b>Maps:</b> Snippets are static plots from the same coordinates as the web map; basemap tiles are not embedded.",
            body,
        )
    )

    story.append(PageBreak())

    # --- Appendix ---
    story.append(Paragraph("9. Appendix &amp; report parameters", h1))
    ps = data.get("parcel_stats") or {}
    by_type = ps.get("by_type") or {}
    parts = [f"<b>{escape(str(k))}:</b> {int(v)}" for k, v in by_type.items()]
    line = f"<b>Total parcels:</b> {int(ps.get('total', 0))}"
    if parts:
        line += "<br/>" + " &nbsp;|&nbsp; ".join(parts)
    story.append(Paragraph(line, body))
    story.append(Spacer(1, 0.06 * inch))
    story.append(
        Paragraph(
            f"<b>Parameters used:</b> scenario {scenario_label}; growth {gr}%/yr; horizon {hy} years; "
            f"filter {lu}.",
            body,
        )
    )

    def _foot(canvas, doc):
        _footer(canvas, doc, muted)

    doc.build(story, onFirstPage=_foot, onLaterPages=_foot)
    pdf = buf.getvalue()
    buf.close()
    return pdf
