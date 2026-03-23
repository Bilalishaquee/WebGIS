"""
Chat API for the water demand assistant. Uses OpenAI with a strict domain prompt.
If OPENAI_API_KEY is not set, returns 503 so the frontend can fall back to keyword answers.
"""
import json
import logging
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

SYSTEM_PROMPT = """You are a helpful assistant for a Water Demand Dashboard. You ONLY answer questions about this neighborhood's water demand and consumption.

Allowed topics:
- Total estimated consumption (daily, monthly, yearly) and population
- Consumption by parcel/land use type (Residential, Commercial, Mixed-use)
- Scenarios: 0.09 m³/c vs 0.1 m³/c per capita per day
- Growth projections and demand forecasts
- Parcel counts and breakdowns

Use the "Current data" below to give accurate numbers. Quote values in cubic meters (m³) when relevant: 1000 liters = 1 m³.

If the user asks about something outside water demand or this dashboard, politely say you can only help with water demand, consumption, and parcel data for this dashboard. Keep answers concise and friendly."""


def _m3(liters: float) -> str:
    if liters >= 1e6:
        return f"{liters / 1e6:.2f}M m³"
    if liters >= 1e3:
        return f"{liters / 1e3:.2f}K m³"
    return f"{liters / 1000:.2f} m³"


async def _build_context(db: AsyncSession, growth_rate: float = 2.0, years: int = 5) -> str:
    r = await db.execute(select(Parcel))
    parcels = list(r.scalars().all())
    total_pop = sum(p.population for p in parcels)

    # Summary 90 and 100 L/c (liters)
    yearly90 = sum(
        parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in parcels
    ) if parcels else 0
    yearly100 = sum(
        parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in parcels
    ) if parcels else 0
    daily90 = yearly90 / 365
    daily100 = yearly100 / 365

    # Land use breakdown (90 L/c)
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
        "summary_90_L_per_capita": {
            "daily_liters": round(daily90, 2),
            "yearly_liters": round(yearly90, 2),
            "daily_m3": _m3(daily90),
            "yearly_m3": _m3(yearly90),
        },
        "summary_100_L_per_capita": {
            "daily_liters": round(daily100, 2),
            "yearly_liters": round(yearly100, 2),
            "daily_m3": _m3(daily100),
            "yearly_m3": _m3(yearly100),
        },
        "land_use_breakdown": breakdown_str,
        "scenario_difference_yearly_m3": _m3(yearly100 - yearly90),
        "forecast": forecast_str,
    }, indent=2)


class ChatRequest(BaseModel):
    message: str


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

    try:
        context = await _build_context(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build context: {e}") from e

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY.strip())
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + "\n\nCurrent data (JSON):\n" + context},
                {"role": "user", "content": message},
            ],
            max_tokens=500,
            temperature=0.3,
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
