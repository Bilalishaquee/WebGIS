from pydantic import BaseModel, Field
from typing import Optional


class ParcelBase(BaseModel):
    parcel_id: str = Field(..., min_length=1, max_length=32)
    land_use: str = Field(..., pattern="^(Residential|Commercial|Mixed-use)$")
    population: int = Field(..., ge=0, le=1000)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ParcelCreate(ParcelBase):
    pass


class ParcelUpdate(BaseModel):
    land_use: Optional[str] = Field(None, pattern="^(Residential|Commercial|Mixed-use)$")
    population: Optional[int] = Field(None, ge=0, le=1000)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)


class ParcelResponse(ParcelBase):
    id: int
    daily90: float
    daily100: float
    yearly90: float
    yearly100: float


class ParcelListResponse(BaseModel):
    parcels: list[ParcelResponse]
    total: int
