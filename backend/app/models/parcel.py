from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Parcel(Base):
    """Parcel model: id, parcel_id, land_use, population, centroid lat/lng, optional geometry JSON."""
    __tablename__ = "parcels"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(String(32), unique=True, index=True, nullable=False)  # e.g. P-0001
    land_use = Column(String(32), nullable=False)  # Residential, Commercial, Mixed-use
    population = Column(Integer, nullable=False, default=0)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    # Optional: store GeoJSON geometry for future PostGIS
    geometry_geojson = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
