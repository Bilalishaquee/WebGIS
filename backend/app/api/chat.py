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
- Neighborhood totals: daily, monthly, or yearly demand; parcel count
- **Population (people):** The JSON always includes `population_people` — total people across parcels, people summed by land use, and min/max/mean people per parcel. **Use these fields** when the user asks how many people, residents, population, or "number of persons in parcels." Do **not** say population is unavailable unless those objects are empty.
- **Consumption vs parcel population:** The JSON includes `consumption_by_parcel_population_threshold` — for each threshold **N**, yearly consumption summed over parcels whose population is **strictly greater than N**, plus **percent_of_neighborhood_consumption** for both 0.09 and 0.1 m³/c scenarios. **Use this** for questions like "properties with more than 10 people," "parcels over 15 residents," or share of demand from high-occupancy parcels. Do **not** say this cannot be computed from the data if the relevant threshold key is present.
- Demand by land use: Residential, Commercial, Mixed-use (counts and shares)
- Two per-capita scenarios: **0.09 m³/c** (lower) vs **0.1 m³/c** (higher) per person per day — never call them "90 L" or "100 L" in your answer; use m³/c labels only
- Forecast rows: demand at year 0 and at the horizon year, using **forecast_parameters** in the JSON. If the note says the user asked for a specific % or years, those values were used — answer using that growth rate and horizon, not the dashboard default unless the note says otherwise
- Scenario gap: difference between the two scenarios when relevant

Rules:
1. Treat the JSON as the only source of truth. Do not invent parcels, populations, or volumes.
2. Express volumes in **m³** (cubic meters). The JSON includes `daily_m3`, `monthly_total_m3`, `yearly_m3`, and `*_liters` — prefer the m³ fields for user-facing text.
3. If the JSON lacks a specific figure, say so briefly instead of guessing.
4. Keep answers concise: short paragraphs or bullets. No long preambles.
5. **Stay helpful on dashboard topics.** Always answer when the question is about: neighborhood or residential/commercial/mixed-use demand, totals, forecasts, growth **%**, changing the growth assumption, comparing 0.09 vs 0.1 m³/c, or "how would demand change if…". Use the JSON and `forecast_parameters` for numbers.
6. Refuse **only** for clearly unrelated topics (other cities, coding, politics, sports, etc.) — one short sentence plus a redirect. **Do not** refuse growth-rate or residential-demand questions; if they ask "how do we increase real-world use," explain this app only **estimates** demand from parcel data, then briefly tie to what the model uses (population, land use, per-capita scenario) and what a higher **forecast growth %** would imply for projected totals.

"""


FINAL_INSTRUCTIONS = """
---
Before you reply, verify:
1. Every volume you cite is consistent with the JSON (`scenario_0_09_m3c`, `scenario_0_1_m3c`, `land_use_breakdown`, `population_people`, `consumption_by_parcel_population_threshold`, `forecast_yearly_totals_explanation`, `scenario_difference_yearly_m3`, `forecast_parameters`).
2. You name scenarios as **0.09 m³/c** (lower) and **0.1 m³/c** (higher), not liters.
3. Any forecast you mention uses the same **annual_growth_percent** and **horizon_years** as in `forecast_parameters`. If **forecast_parameters.how_set** explains that values came from the user's question, state that clearly (e.g. "at 3% annual growth over 5 years").
4. If the question is clearly unrelated to this dashboard, answer in one short sentence declining and suggesting a water-demand question. Otherwise answer fully.

Now answer the user's message below.
"""


def _parse_forecast_intent(text: str) -> tuple[float | None, int | None]:
    """Extract annual growth % and horizon years from the user message when asked explicitly."""
    t = text.lower()
    growth: float | None = None
    years: int | None = None

    for pattern in (
        r"from\s+(\d+(?:\.\d+)?)\s*(?:%|percent)\s+to\s+(\d+(?:\.\d+)?)\s*(?:%|percent)",
        r"\b(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s*(?:%|percent)\b",
        r"(?:with|at|using)\s+(\d+(?:\.\d+)?)\s*%\s*(?:annual\s*)?(?:growth|increase|rate)?",
        r"(\d+(?:\.\d+)?)\s*%\s*(?:annual\s*)?(?:growth|increase)(?:\s*rate)?",
        r"\bgrowth\s*(?:rate\s*)?(?:of|at|=)?\s*(\d+(?:\.\d+)?)\s*%",
        r"(?:annual|yearly)\s+growth\s*(?:of|at|=)?\s*(\d+(?:\.\d+)?)\s*%",
        r"\b(\d+(?:\.\d+)?)\s*%\s*per\s*year\b",
        r"increase\s+(?:the\s+)?(?:water\s+)?(?:consumption|demand)\s+(?:from\s+)?(?:\d+(?:\.\d+)?\s*(?:%|percent)\s+)?to\s+(\d+(?:\.\d+)?)\s*(?:%|percent)",
    ):
        m = re.search(pattern, t)
        if m:
            groups = m.groups()
            # "from 2% to 3%" / "2 to 3 percent" → use the second number as the forecast growth rate
            v = float(groups[1]) if len(groups) >= 2 and groups[1] is not None else float(groups[0])
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


def _parse_population_threshold_from_question(text: str) -> int | None:
    """e.g. 'more than 10 people' -> 10; used to add that threshold to context."""
    t = text.lower()
    patterns = (
        r"(?:more than|greater than|over|above)\s+(\d+)\s+(?:people|persons|residents|inhabitants)\b",
        r"\bparcels?\s+with\s+(?:more than|over|above)\s+(\d+)\s+(?:people|persons)\b",
        r"\bproperties?\s+with\s+(?:more than|over|above)\s+(\d+)\s+(?:people|persons)\b",
        r"\bpopulation\s*(?:>|greater than|more than)\s*(\d+)\b",
        # Spanish
        r"(?:más de|mas de|mayor que|por encima de|sobre)\s+(\d+)\s+(?:personas|habitantes|residentes)\b",
        r"(?:predios|propiedades|parcelas|lotes)\s+(?:con\s+poblaci[oó]n\s+)?(?:más de|mas de|mayor que|por encima de|sobre)\s+(\d+)",
        r"(?:poblaci[oó]n)\s*(?:>\s*|mayor que|más de|mas de|por encima de|sobre)\s*(\d+)",
    )
    for pat in patterns:
        m = re.search(pat, t)
        if m:
            # Some regexes have the threshold as group(1), others as group(2)
            v = int(next(g for g in m.groups() if g is not None))
            if 0 <= v <= 2000:
                return v
    return None


def _extract_recent_history_text(history: list[dict[str, str]] | None, limit: int = 4) -> str:
    if not history:
        return ""
    parts: list[str] = []
    for item in history[-limit:]:
        role = (item or {}).get("role")
        content = (item or {}).get("content")
        if role in ("user", "assistant") and content:
            parts.append(str(content))
    return " ".join(parts)


def _parse_followup_threshold_with_context(message: str, history_text: str) -> int | None:
    """
    Handle short follow-ups like:
    - "con 8" / "with 8"
    when prior turns already mention people/population thresholds.
    """
    if not history_text:
        return None
    history_l = history_text.lower()
    if not re.search(r"(people|persons|residents|inhabitants|personas|habitantes|residentes|poblaci[oó]n)", history_l):
        return None

    m = re.search(r"\b(?:con|with)\s+(\d{1,4})\b", (message or "").lower())
    if m:
        v = int(m.group(1))
        if 0 <= v <= 2000:
            return v
    return None


def _m3(liters: float) -> str:
    if liters >= 1e6:
        return f"{liters / 1e6:.2f}M m³"
    if liters >= 1e3:
        return f"{liters / 1e3:.2f}K m³"
    return f"{liters / 1000:.2f} m³"


def _consumption_share_population_gt(
    parcels: list,
    threshold: int,
    yearly90_total: float,
    yearly100_total: float,
) -> dict[str, float | int | str]:
    """Sum yearly consumption for parcels with population strictly greater than threshold."""
    over = [p for p in parcels if int(p.population or 0) > threshold]
    y90 = sum(
        parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in over
    )
    y100 = sum(
        parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in over
    )
    return {
        "description": f"Parcels with population strictly greater than {threshold} people",
        "parcel_count": len(over),
        "yearly_consumption_liters_0_09": round(y90, 2),
        "yearly_consumption_m3_0_09": _m3(y90),
        "percent_of_neighborhood_consumption_0_09": round(
            (y90 / yearly90_total * 100) if yearly90_total else 0.0,
            2,
        ),
        "yearly_consumption_liters_0_1": round(y100, 2),
        "yearly_consumption_m3_0_1": _m3(y100),
        "percent_of_neighborhood_consumption_0_1": round(
            (y100 / yearly100_total * 100) if yearly100_total else 0.0,
            2,
        ),
    }


async def _build_context(
    db: AsyncSession,
    growth_rate: float = 2.0,
    years: int = 5,
    forecast_how_set: str | None = None,
    user_message: str | None = None,
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

    pops = [int(p.population or 0) for p in parcels]
    pop_by_land_use: dict[str, int] = {}
    for p in parcels:
        lu = p.land_use
        pop_by_land_use[lu] = pop_by_land_use.get(lu, 0) + int(p.population or 0)

    per_parcel: dict[str, int | float] = {}
    if pops:
        per_parcel = {
            "min_people": min(pops),
            "max_people": max(pops),
            "mean_people_per_parcel": round(sum(pops) / len(pops), 2),
        }

    population_people = {
        "total_across_all_parcels": total_pop,
        "people_by_land_use": pop_by_land_use,
        "per_parcel_stats": per_parcel,
        "note": "Each parcel has an estimated population (people). Sums above are from the parcel database.",
    }

    threshold_set = {5, 10, 15, 20, 25, 50}
    extra = _parse_population_threshold_from_question(user_message or "")
    if extra is not None:
        threshold_set.add(max(0, min(2000, extra)))

    consumption_by_parcel_population_threshold = {
        "basis": (
            "For each threshold N, only parcels with population > N are included. "
            "Percentages are share of total neighborhood yearly consumption (same scenarios as elsewhere)."
        ),
        "neighborhood_yearly_total_liters_0_09": round(yearly90, 2),
        "neighborhood_yearly_total_liters_0_1": round(yearly100, 2),
        "thresholds": {
            str(t): _consumption_share_population_gt(parcels, t, yearly90, yearly100)
            for t in sorted(threshold_set)
        },
    }

    return json.dumps({
        "parcel_count": len(parcels),
        "population": total_pop,
        "population_people": population_people,
        "consumption_by_parcel_population_threshold": consumption_by_parcel_population_threshold,
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
    history: list[dict[str, str]] | None = None


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
    openai_configured = bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())

    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    history_text = _extract_recent_history_text(body.history, limit=4)
    parsing_text = f"{history_text}\n{message}".strip()
    message_l = message.lower()

    # Deterministic numeric answers for threshold consumption/share queries.
    # This avoids inconsistencies from the LLM when the user asks for exact percentages.
    # Prefer the number from the current message; use history-based follow-up only when explicit.
    threshold_from_message = _parse_population_threshold_from_question(message)
    threshold_followup = _parse_followup_threshold_with_context(message, history_text)
    threshold = threshold_from_message if threshold_from_message is not None else threshold_followup

    # IMPORTANT: trigger deterministic threshold math based on the CURRENT message,
    # not historical text, to avoid hijacking unrelated questions.
    wants_consumption_share = (
        bool(
            re.search(
                r"(percent|porcentaje|%|share|proporci|proportion|equivale|corresponde|parte)",
                message_l,
            )
        )
        and bool(re.search(r"(consum|demand|demanda|consumo)", message_l))
    )
    # Short follow-up like "with 8" can rely on prior context.
    is_short_threshold_followup = (
        threshold_followup is not None
        and bool(re.search(r"\b(con|with)\s+\d{1,4}\b", message_l))
    )
    if threshold is not None and (wants_consumption_share or is_short_threshold_followup):
        r = await db.execute(select(Parcel))
        parcels = list(r.scalars().all())
        yearly90_total = sum(
            parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in parcels
        ) if parcels else 0
        yearly100_total = sum(
            parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in parcels
        ) if parcels else 0
        res = _consumption_share_population_gt(
            parcels, threshold, yearly90_total=yearly90_total, yearly100_total=yearly100_total
        )

        is_es = bool(re.search(r"(porcentaje|consumo|predios|vecindario|personas|más de|mas de)", message_l))
        if is_es:
            reply = (
                f"Para los predios con población estrictamente mayor que {threshold} personas:\n"
                f"• Consumo anual (0.09 m³/c): {res['percent_of_neighborhood_consumption_0_09']}% "
                f"del total del vecindario ({res['yearly_consumption_m3_0_09']}).\n"
                f"• Consumo anual (0.1 m³/c): {res['percent_of_neighborhood_consumption_0_1']}% "
                f"del total del vecindario ({res['yearly_consumption_m3_0_1']}).\n"
                f"\nPredios que cumplen: {res['parcel_count']}."
            )
        else:
            reply = (
                f"Parcels with population strictly greater than {threshold} people:\n"
                f"• Share of neighborhood annual demand (0.09 m³/c): {res['percent_of_neighborhood_consumption_0_09']}% "
                f"({res['yearly_consumption_m3_0_09']} yearly).\n"
                f"• Share of neighborhood annual demand (0.1 m³/c): {res['percent_of_neighborhood_consumption_0_1']}% "
                f"({res['yearly_consumption_m3_0_1']} yearly).\n"
                f"\nMatching parcels: {res['parcel_count']}."
            )
        return ChatResponse(reply=reply)

    gr = 2.0 if body.growth_rate is None else float(body.growth_rate)
    py = 5 if body.projection_years is None else int(body.projection_years)
    gr = max(0.0, min(20.0, gr))
    py = max(1, min(20, py))

    msg_growth, msg_years = _parse_forecast_intent(parsing_text)
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
        context = await _build_context(
            db,
            growth_rate=gr,
            years=py,
            forecast_how_set=forecast_how_set,
            user_message=parsing_text,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build context: {e}") from e

    system_content = SYSTEM_PROMPT + "\n" + context + FINAL_INSTRUCTIONS

    try:
        if not openai_configured:
            raise HTTPException(
                status_code=503,
                detail="Chat is not configured (OPENAI_API_KEY not set). Use the dashboard for data.",
            )
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY.strip())

        openai_messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
        if body.history:
            for item in body.history[-8:]:
                role = (item or {}).get("role")
                content = (item or {}).get("content")
                if role in ("user", "assistant") and content:
                    openai_messages.append({"role": role, "content": content})
        openai_messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
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
