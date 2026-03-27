"""
Chat API for the water demand assistant. Uses OpenAI with a strict domain prompt.
If OPENAI_API_KEY is not set, returns 503 so the frontend can fall back to keyword answers.
"""
import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.config import get_settings
from app.database import get_db
from app.models.parcel import Parcel
from app.api.deps import get_current_user_id
from app.services.consumption import (
    parcel_yearly_consumption,
    L_PER_CAPITA_90,
    L_PER_CAPITA_100,
)
from app.services.forecast import project_demand

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """You are the Water Demand Assistant for a single neighborhood dashboard. Explain estimated water demand using ONLY the JSON object that appears right after this text (no other sources).

Scope (stay on topic):
- Neighborhood totals: daily, monthly, or yearly demand; population; parcel count
- Demand by land use: Residential, Commercial, Mixed-use (counts and shares)
- Two per-capita scenarios: **0.09 m³/c** (lower) vs **0.1 m³/c** (higher) per person per day — never call them "90 L" or "100 L" in your answer; use m³/c labels only
- Forecast rows: demand at year 0 and at the horizon year, using **forecast_parameters** in the JSON. If the note says the user asked for a specific % or years, those values were used — answer using that growth rate and horizon, not the dashboard default unless the note says otherwise
- Scenario gap: difference between the two scenarios when relevant

Rules:
1. Treat the JSON as the only source of truth. Do not invent parcels, populations, or volumes.
2. Express volumes in **m³** (cubic meters). The JSON includes `daily_m3`, `monthly_total_m3`, `yearly_m3`, and `*_liters` — prefer the m³ fields for user-facing text.
3. If the JSON lacks a specific figure, say so briefly instead of guessing.
4. Keep answers concise: short paragraphs or bullets. No long preambles.
5. If the user asks about unrelated topics (general knowledge, other cities, coding, politics), refuse briefly and redirect to water demand for this dashboard.

"""


FINAL_INSTRUCTIONS = """
---
Before you reply, verify:
1. Every volume you cite is consistent with the JSON (`scenario_0_09_m3c`, `scenario_0_1_m3c`, `land_use_breakdown`, `forecast_yearly_totals_explanation`, `scenario_difference_yearly_m3`, `forecast_parameters`).
2. You name scenarios as **0.09 m³/c** (lower) and **0.1 m³/c** (higher), not liters.
3. Any forecast you mention uses the same **annual_growth_percent** and **horizon_years** as in `forecast_parameters`. If **forecast_parameters.how_set** explains that values came from the user's question, state that clearly (e.g. "at 3% annual growth over 5 years").
4. If the question is off-topic, answer in one short sentence declining and suggesting a water-demand question.

Now answer the user's message below.
"""


def _parse_forecast_intent(text: str) -> tuple[float | None, int | None]:
    """Extract annual growth % and horizon years from the user message when asked explicitly."""
    t = text.lower()
    growth: float | None = None
    years: int | None = None

    for pattern in (
        r"(?:with|at|using)\s+(\d+(?:\.\d+)?)\s*%\s*(?:annual\s*)?(?:growth|increase|rate)?",
        r"(\d+(?:\.\d+)?)\s*%\s*(?:annual\s*)?(?:growth|increase)(?:\s*rate)?",
        r"\bgrowth\s*(?:rate\s*)?(?:of|at|=)?\s*(\d+(?:\.\d+)?)\s*%",
        r"(?:annual|yearly)\s+growth\s*(?:of|at|=)?\s*(\d+(?:\.\d+)?)\s*%",
        r"\b(\d+(?:\.\d+)?)\s*%\s*per\s*year\b",
    ):
        m = re.search(pattern, t)
        if m:
            v = float(m.group(1))
            if 0.0 <= v <= 20.0:
                growth = v
                break

    for pattern in (
        r"\bin\s+(\d{1,2})\s*years?\b",
        r"\bfor\s+(\d{1,2})\s*years?\b",
        r"\b(\d{1,2})\s*years?\s*(?:from\s*now|ahead)\b",
        r"\bover\s+(\d{1,2})\s*years?\b",
        r"\b(\d{1,2})\s*-\s*year\s*(?:horizon|period|projection)\b",
        r"\bnext\s+(\d{1,2})\s*years?\b",
    ):
        m = re.search(pattern, t)
        if m:
            y = int(m.group(1))
            if 1 <= y <= 20:
                years = y
                break

    return growth, years


def _m3(liters: float) -> str:
    if liters >= 1e6:
        return f"{liters / 1e6:.2f}M m³"
    if liters >= 1e3:
        return f"{liters / 1e3:.2f}K m³"
    return f"{liters / 1000:.2f} m³"


async def _build_context(
    db: AsyncSession,
    growth_rate: float = 2.0,
    years: int = 5,
    forecast_how_set: str | None = None,
) -> str:
    growth_rate = max(0.0, min(20.0, float(growth_rate)))
    r = await db.execute(select(Parcel))
    parcels = list(r.scalars().all())
    total_pop = sum(p.population for p in parcels)

    yearly90 = sum(
        parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in parcels
    ) if parcels else 0
    yearly100 = sum(
        parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in parcels
    ) if parcels else 0
    daily90 = yearly90 / 365
    daily100 = yearly100 / 365
    monthly90 = yearly90 / 12
    monthly100 = yearly100 / 12

    # Land use breakdown (0.09 m³/c scenario basis)
    breakdown = {"Residential": {"count": 0, "consumption": 0}, "Commercial": {"count": 0, "consumption": 0}, "Mixed-use": {"count": 0, "consumption": 0}}
    for p in parcels:
        breakdown[p.land_use]["count"] += 1
        breakdown[p.land_use]["consumption"] += parcel_yearly_consumption(
            p.population, L_PER_CAPITA_90, p.land_use
        )
    total_consumption = sum(b["consumption"] for b in breakdown.values())
    breakdown_str = ", ".join(
        f"{k}: {v['count']} parcels, {_m3(v['consumption'])}/year"
        + (f" ({(v['consumption'] / total_consumption * 100):.1f}%)" if total_consumption else "")
        for k, v in breakdown.items()
    )

    # Forecast
    years = max(1, min(20, years))
    forecast_data = project_demand(yearly90, yearly100, growth_rate, years)
    first = forecast_data[0]
    last = forecast_data[-1]
    forecast_str = (
        f"Year 0: 0.09 m³/c={_m3(first['year90'])}, 0.1 m³/c={_m3(first['year100'])}. "
        f"Year {years}: 0.09 m³/c={_m3(last['year90'])}, 0.1 m³/c={_m3(last['year100'])} "
        f"({growth_rate}% annual growth)."
    )

    return json.dumps({
        "parcel_count": len(parcels),
        "population": total_pop,
        "forecast_parameters": {
            "annual_growth_percent": growth_rate,
            "horizon_years": years,
            "how_set": forecast_how_set
            or "Dashboard default (header growth % and projection years).",
        },
        "scenario_0_09_m3c": {
            "label": "0.09 m³/c per person per day (lower scenario)",
            "daily_liters": round(daily90, 2),
            "yearly_liters": round(yearly90, 2),
            "daily_m3": _m3(daily90),
            "monthly_total_m3": _m3(monthly90),
            "yearly_m3": _m3(yearly90),
        },
        "scenario_0_1_m3c": {
            "label": "0.1 m³/c per person per day (higher scenario)",
            "daily_liters": round(daily100, 2),
            "yearly_liters": round(yearly100, 2),
            "daily_m3": _m3(daily100),
            "monthly_total_m3": _m3(monthly100),
            "yearly_m3": _m3(yearly100),
        },
        "land_use_breakdown": breakdown_str,
        "scenario_difference_yearly_m3": _m3(yearly100 - yearly90),
        "forecast_yearly_totals_explanation": forecast_str,
    }, indent=2)


class ChatRequest(BaseModel):
    message: str
    growth_rate: float | None = None  # matches dashboard; used for forecast in context
    projection_years: int | None = None


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Answer the user's question about water demand using OpenAI, scoped to dashboard data only."""
    settings = get_settings()
    if not settings.OPENAI_API_KEY or not settings.OPENAI_API_KEY.strip():
        raise HTTPException(
            status_code=503,
            detail="Chat is not configured (OPENAI_API_KEY not set). Use the dashboard for data.",
        )

    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    gr = 2.0 if body.growth_rate is None else float(body.growth_rate)
    py = 5 if body.projection_years is None else int(body.projection_years)
    gr = max(0.0, min(20.0, gr))
    py = max(1, min(20, py))

    msg_growth, msg_years = _parse_forecast_intent(message)
    how_parts: list[str] = []
    if msg_growth is not None:
        gr = msg_growth
        how_parts.append(f"annual growth {gr}% from your question")
    if msg_years is not None:
        py = msg_years
        how_parts.append(f"{py}-year horizon from your question")
    forecast_how_set = (
        "Forecast uses " + " and ".join(how_parts) + "."
        if how_parts
        else None
    )

    try:
        context = await _build_context(db, growth_rate=gr, years=py, forecast_how_set=forecast_how_set)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build context: {e}") from e

    system_content = SYSTEM_PROMPT + "\n" + context + FINAL_INSTRUCTIONS

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY.strip())
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": message},
            ],
            max_tokens=900,
            temperature=0.25,
        )
        reply = (response.choices[0].message.content or "").strip()
        if not reply:
            reply = "I couldn't generate a reply. Please try rephrasing your question about water demand."
        return ChatResponse(reply=reply)
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, "message"):
            err_msg = getattr(e, "message", err_msg)
        if hasattr(e, "body") and e.body:
            try:
                body = e.body if isinstance(e.body, str) else e.body.decode("utf-8", errors="replace")
                err_msg = body[:500] if len(body) > 500 else body
            except Exception:
                pass
        logger.exception("OpenAI chat request failed")
        # Quota/rate limit -> 503 so frontend can show "unavailable" and use fallback
        is_quota_or_rate = (
            getattr(e, "code", None) == "insufficient_quota"
            or getattr(e, "status_code", None) == 429
            or "quota" in err_msg.lower()
            or "rate limit" in err_msg.lower()
        )
        status = 503 if is_quota_or_rate else 502
        detail = (
            "OpenAI quota exceeded. Check your plan and billing at platform.openai.com. Using dashboard data for answers."
            if is_quota_or_rate
            else f"OpenAI request failed: {err_msg}"
        )
        raise HTTPException(status_code=status, detail=detail) from e
