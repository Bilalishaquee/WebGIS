"""
Seed parcels table with ~380 parcels.
Run from repo root: python backend/seed_parcels.py
Or from backend: python seed_parcels.py (after pip install -r requirements.txt)
"""
import asyncio
import random
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.parcel import Parcel
from app.config import get_settings

LAND_USE = ["Residential", "Commercial", "Mixed-use"]
LAT, LNG = 40.7128, -74.0060


async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await session.execute(delete(Parcel))
        await session.commit()

        for i in range(1, 381):
            population = random.randint(2, 15)
            land_use = random.choice(LAND_USE)
            parcel_id = f"P-{str(i).zfill(4)}"
            lat = LAT + (random.random() - 0.5) * 0.1
            lng = LNG + (random.random() - 0.5) * 0.1
            session.add(
                Parcel(
                    parcel_id=parcel_id,
                    land_use=land_use,
                    population=population,
                    lat=lat,
                    lng=lng,
                )
            )
        await session.commit()
    print("Seeded 380 parcels.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
