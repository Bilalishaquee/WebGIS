"""
PDF export: multi-page water demand report with charts, map snippets, and structured AI analysis.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.config import get_settings
from app.database import get_db
from app.models.parcel import Parcel
from app.services.consumption import (
    parcel_daily_consumption,
    parcel_yearly_consumption,
    L_PER_CAPITA_90,
    L_PER_CAPITA_100,
)
from app.services.forecast import project_demand
from app.services.report_pdf import build_water_demand_report_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])

MAX_MAP_POINTS = 900


def _parse_ai_sections(raw: str) -> dict[str, str]:
    """Parse AI output with EXECUTIVE / FINDINGS / RECOMMENDATIONS / LIMITATIONS markers."""
    out = {"executive": "", "findings": "", "recommendations": "", "limitations": ""}
    if not raw or not str(raw).strip():
        return out
    text = str(raw).strip()
    markers = {
        "EXECUTIVE": "executive",
        "FINDINGS": "findings",
        "RECOMMENDATIONS": "recommendations",
        "LIMITATIONS": "limitations",
    }
    current: str | None = None
    buf: list[str] = []
    for line in text.splitlines():
        u = line.strip().upper()
        if u in markers:
            if current:
                out[current] = "\n".join(buf).strip()
            current = markers[u]
            buf = []
        else:
            buf.append(line)
    if current:
        out[current] = "\n".join(buf).strip()
    if not any(v.strip() for v in out.values()):
        out["executive"] = text
    return out


async def _gather_report_payload(
    db: AsyncSession,
    scenario: int,
    growth_rate: float,
    years: int,
    land_use: str | None,
) -> dict:
    q = select(Parcel)
    if land_use and land_use in ("Residential", "Commercial", "Mixed-use"):
        q = q.where(Parcel.land_use == land_use)
    r = await db.execute(q)
    parcels = list(r.scalars().all())

    l_per = L_PER_CAPITA_100 if scenario == 100 else L_PER_CAPITA_90
    total_daily = sum(parcel_daily_consumption(p.population, l_per, p.land_use) for p in parcels)
    total_pop = sum(p.population for p in parcels)

    breakdown_map = {"Residential": {"count": 0, "consumption": 0}, "Commercial": {"count": 0, "consumption": 0}, "Mixed-use": {"count": 0, "consumption": 0}}
    for p in parcels:
        breakdown_map[p.land_use]["count"] += 1
        breakdown_map[p.land_use]["consumption"] += parcel_yearly_consumption(
            p.population, L_PER_CAPITA_90, p.land_use
        )
    total_c = sum(b["consumption"] for b in breakdown_map.values())
    breakdown_list = [
        {
            "type": k,
            "count": v["count"],
            "consumption": v["consumption"],
            "percentage": f"{(v['consumption'] / total_c * 100):.1f}" if total_c else "0",
        }
        for k, v in breakdown_map.items()
    ]

    base90 = sum(parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in parcels)
    base100 = sum(parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in parcels)
    growth_rate = max(0.0, min(20.0, float(growth_rate)))
    years = max(1, min(20, int(years)))
    fd = project_demand(base90, base100, growth_rate, years)

    scenario_label = "0.1 m³/c" if scenario == 100 else "0.09 m³/c"
    lu = land_use or "All"

    parcel_points = []
    for p in parcels:
        parcel_points.append(
            {
                "parcel_id": p.parcel_id,
                "lat": float(p.lat),
                "lng": float(p.lng),
                "land_use": p.land_use,
                "population": int(p.population or 0),
                "yearly_liters": parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use),
            }
        )
    if len(parcel_points) > MAX_MAP_POINTS:
        step = max(1, len(parcel_points) // MAX_MAP_POINTS)
        parcel_points = parcel_points[::step]

    parcel_sample = [
        {
            "parcel_id": p.parcel_id,
            "land_use": p.land_use,
            "population": p.population,
            "lat": float(p.lat),
            "lng": float(p.lng),
        }
        for p in parcels[:400]
    ]

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "scenario_label": scenario_label,
        "growth_rate": growth_rate,
        "horizon_years": years,
        "land_use_filter": lu,
        "summary": {
            "daily": total_daily,
            "monthly": total_daily * 30,
            "yearly": total_daily * 365,
            "population": total_pop,
        },
        "breakdown": breakdown_list,
        "forecast": {
            "year90": [row["year90"] for row in fd],
            "year100": [row["year100"] for row in fd],
        },
        "scenario_comparison": {
            "low": base90,
            "high": base100,
            "diff": base100 - base90,
        },
        "parcel_stats": {
            "total": len(parcels),
            "by_type": {k: breakdown_map[k]["count"] for k in breakdown_map},
        },
        "parcel_points": parcel_points,
        "parcel_sample": parcel_sample,
    }


async def _ai_structured_analysis(payload: dict) -> dict[str, str]:
    settings = get_settings()
    key = (settings.OPENAI_API_KEY or "").strip()

    sm = payload.get("summary") or {}
    bd = payload.get("breakdown") or []
    gr = payload.get("growth_rate")
    hy = payload.get("horizon_years")
    fc = payload.get("forecast") or {}
    y90 = fc.get("year90") or []
    y100 = fc.get("year100") or []
    last90 = y90[-1] if y90 else 0
    last100 = y100[-1] if y100 else 0
    ps = payload.get("parcel_stats") or {}

    land_bits = ", ".join(f"{b.get('type')}: {b.get('percentage')}%" for b in bd)
    facts = (
        f"Population (estimated): {sm.get('population', 0)}. "
        f"Neighborhood yearly demand for selected scenario (liters): {sm.get('yearly', 0)}. "
        f"Parcels: {ps.get('total', 0)}. "
        f"Forecast final year index {hy}: 0.09 m³/c yearly liters {last90}; 0.1 m³/c yearly liters {last100}. "
        f"Land use share of yearly demand: {land_bits}. "
        f"Compound growth {gr}% per year over {hy} years."
    )

    if not key:
        return {
            "executive": (
                "This report consolidates estimated neighborhood water demand using the same model as the dashboard. "
                "Use the following sections for KPIs, land-use shares, spatial patterns, forecast trajectories, and scenario gaps. "
                "Configure OPENAI_API_KEY on the server for an AI-written executive narrative."
            ),
            "findings": (
                "- Demand scales with population, land-use mix, and the selected per-capita scenario.\n"
                "- The forecast applies compound growth to current yearly baselines for both 0.09 and 0.1 m³/c cases.\n"
                "- Map snippets summarize parcel locations and relative intensity; they are not satellite basemaps."
            ),
            "recommendations": (
                "- Cross-check model outputs with local planning assumptions and any available meter samples.\n"
                "- Re-run the export after updating parcel data or scenario controls.\n"
                "- Use the dashboard map for interactive exploration of individual parcels."
            ),
            "limitations": (
                "Figures are model estimates, not metered billing data. Growth is a simple compound rate on aggregates; "
                "spatial plots omit street basemap tiles."
            ),
        }

    instructions = """Write a structured utility-planning report using ONLY the facts provided.

Output exactly in this format (include the words EXECUTIVE, FINDINGS, RECOMMENDATIONS, LIMITATIONS as line headers):

EXECUTIVE
(3–5 short paragraphs: overview, demand scale in m³ where helpful, forecast implication, audience = planners/utilities)

FINDINGS
(5–8 bullet lines starting with "- " covering land-use mix, scenario gap, growth sensitivity, population link)

RECOMMENDATIONS
(4–6 bullet lines starting with "- " — practical next steps for data review, engagement, monitoring)

LIMITATIONS
(1–2 paragraphs on what the model does NOT capture: metering, climate, pipe losses, etc.)

Rules: Use m³ for volumes (1 m³ = 1000 L). No invented numbers. Professional neutral tone."""

    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": instructions},
                {"role": "user", "content": f"Facts:\n{facts}\n\nProduce the structured report."},
            ],
            max_tokens=1400,
            temperature=0.3,
        )
        raw = (resp.choices[0].message.content or "").strip()
        parsed = _parse_ai_sections(raw)
        if not any(parsed.values()):
            parsed["executive"] = raw or "Analysis unavailable."
        return parsed
    except Exception as e:
        logger.warning("AI structured analysis failed: %s", e)
        return {
            "executive": "Automated analysis could not be generated; tables and charts remain valid.",
            "findings": "",
            "recommendations": "",
            "limitations": str(e)[:200],
        }


@router.get("/pdf-report")
async def export_pdf_report(
    scenario: int = 90,
    growth_rate: float = 2.0,
    years: int = 5,
    land_use: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Download a multi-page PDF report."""
    if scenario not in (90, 100):
        raise HTTPException(status_code=400, detail="scenario must be 90 or 100")

    try:
        payload = await _gather_report_payload(db, scenario, growth_rate, years, land_use)
        ai_sections = await _ai_structured_analysis(payload)
        pdf_bytes = build_water_demand_report_pdf(payload, ai_sections)
    except Exception as e:
        logger.exception("PDF export failed")
        raise HTTPException(status_code=500, detail=f"Could not build report: {e}") from e

    filename = f"water-demand-report-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
