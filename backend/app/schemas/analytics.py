from pydantic import BaseModel
from typing import List


class SummaryMetrics(BaseModel):
    daily: float
    monthly: float
    yearly: float
    population: int


class LandUseBreakdownItem(BaseModel):
    type: str
    count: int
    consumption: float
    percentage: str


class LandUseBreakdown(BaseModel):
    breakdown: List[LandUseBreakdownItem]


class ForecastYear(BaseModel):
    year: str
    year90: float
    year100: float


class ForecastResponse(BaseModel):
    data: List[ForecastYear]


class ScenarioComparisonItem(BaseModel):
    name: str
    value: float


class ScenarioComparison(BaseModel):
    comparison: List[ScenarioComparisonItem]
    difference: float
