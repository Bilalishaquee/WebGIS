from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.parcel import Parcel
from app.schemas.analytics import (
    SummaryMetrics,
    LandUseBreakdown,
    LandUseBreakdownItem,
    ForecastResponse,
    ForecastYear,
    ScenarioComparison,
    ScenarioComparisonItem,
)
from app.services.consumption import (
    parcel_daily_consumption,
    parcel_yearly_consumption,
    L_PER_CAPITA_90,
    L_PER_CAPITA_100,
)
from app.services.forecast import project_demand
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryMetrics)
async def get_summary(
    scenario: int = 90,
    land_use: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Total neighborhood demand: daily, monthly, yearly, population. scenario=90 or 100 (L/capita). Optional land_use filter (Residential, Commercial, Mixed-use)."""
    q = select(Parcel)
    if land_use and land_use in ("Residential", "Commercial", "Mixed-use"):
        q = q.where(Parcel.land_use == land_use)
    r = await db.execute(q)
    parcels = list(r.scalars().all())
    l_per_capita = L_PER_CAPITA_100 if scenario == 100 else L_PER_CAPITA_90
    total_daily = sum(parcel_daily_consumption(p.population, l_per_capita, p.land_use) for p in parcels)
    total_pop = sum(p.population for p in parcels)
    return SummaryMetrics(
        daily=total_daily,
        monthly=total_daily * 30,
        yearly=total_daily * 365,
        population=total_pop,
    )


@router.get("/land-use", response_model=LandUseBreakdown)
async def get_land_use_breakdown(
    land_use: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Land-use category comparison (count, consumption, percentage). Uses 90 L/c. Optional land_use filter."""
    q = select(Parcel)
    if land_use and land_use in ("Residential", "Commercial", "Mixed-use"):
        q = q.where(Parcel.land_use == land_use)
    r = await db.execute(q)
    parcels = list(r.scalars().all())
    breakdown = {"Residential": {"count": 0, "consumption": 0}, "Commercial": {"count": 0, "consumption": 0}, "Mixed-use": {"count": 0, "consumption": 0}}
    for p in parcels:
        breakdown[p.land_use]["count"] += 1
        breakdown[p.land_use]["consumption"] += parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use)
    total = sum(b["consumption"] for b in breakdown.values())
    items = [
        LandUseBreakdownItem(
            type=k,
            count=v["count"],
            consumption=v["consumption"],
            percentage=f"{(v['consumption'] / total * 100):.1f}" if total else "0",
        )
        for k, v in breakdown.items()
    ]
    return LandUseBreakdown(breakdown=items)


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    growth_rate: float = 2.0,
    years: int = 5,
    land_use: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Demand projection. growth_rate in %, years 1-20. Optional land_use filter."""
    years = max(1, min(20, years))
    q = select(Parcel)
    if land_use and land_use in ("Residential", "Commercial", "Mixed-use"):
        q = q.where(Parcel.land_use == land_use)
    r = await db.execute(q)
    parcels = list(r.scalars().all())
    base90 = sum(parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in parcels)
    base100 = sum(parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in parcels)
    data = project_demand(base90, base100, growth_rate, years)
    return ForecastResponse(data=[ForecastYear(**d) for d in data])


@router.get("/scenario-comparison", response_model=ScenarioComparison)
async def get_scenario_comparison(
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Scenario comparison: 90 L/c vs 100 L/c yearly demand (liters)."""
    r = await db.execute(select(Parcel))
    parcels = list(r.scalars().all())
    y90 = sum(parcel_yearly_consumption(p.population, L_PER_CAPITA_90, p.land_use) for p in parcels)
    y100 = sum(parcel_yearly_consumption(p.population, L_PER_CAPITA_100, p.land_use) for p in parcels)
    return ScenarioComparison(
        comparison=[
            ScenarioComparisonItem(name="90 L/c", value=y90),
            ScenarioComparisonItem(name="100 L/c", value=y100),
        ],
        difference=y100 - y90,
    )
