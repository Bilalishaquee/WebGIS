"""
Seed the parcels table using San Miguel data from the project folder or .aprx.

Data source (in order):
1. Building.shp in SanMiguel 2/ or data/
2. parcels.csv in SanMiguel 2/
3. If neither exists: create initial parcels from map extent (Map/Map.json) and save to parcels.csv.
   So having only the SanMiguel 2 folder is enough; replace parcels.csv later with real data.

Run from backend: python scripts/seed_sanmiguel.py
Requires: pyshp if using Building.shp
"""
import asyncio
import csv
import json
import math
import random
import sys
import zipfile
from pathlib import Path

# Backend root
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# San Miguel data: prefer backend/data/SanMiguel2 (shipped with backend for deploy), else WebGIS/SanMiguel 2
SANMIGUEL_DIR = BACKEND_DIR / "data" / "SanMiguel2"
if not (SANMIGUEL_DIR / "parcels.csv").exists() and not (SANMIGUEL_DIR / "Map" / "Map.json").exists():
    WEBGIS_DIR = BACKEND_DIR.parent
    _SANMIGUEL_ALT = WEBGIS_DIR / "SanMiguel 2"
    if (_SANMIGUEL_ALT / "parcels.csv").exists() or (_SANMIGUEL_ALT / "Map" / "Map.json").exists():
        SANMIGUEL_DIR = _SANMIGUEL_ALT

WEBGIS_DIR = BACKEND_DIR.parent
APRX_PATH = WEBGIS_DIR / "SanMiguel.aprx"
DATA_DIR = WEBGIS_DIR / "data"

# Look for Building.shp in SanMiguel dir first, then data/
def _find_building_shp() -> Path | None:
    for d in (SANMIGUEL_DIR, DATA_DIR):
        p = d / "Building.shp"
        if p.exists():
            return p
    return None

PARCELS_CSV = SANMIGUEL_DIR / "parcels.csv"

LAND_USE_VALUES = ["Residential", "Commercial", "Mixed-use"]


def web_mercator_to_wgs84(x: float, y: float) -> tuple[float, float]:
    """Convert Web Mercator (EPSG:3857) to WGS84 lat, lng."""
    lon_deg = x * 180.0 / 20037508.34
    lat_rad = math.pi / 2.0 - 2.0 * math.atan(math.exp(-y / 6378137.0))
    lat_deg = lat_rad * 180.0 / math.pi
    return (lat_deg, lon_deg)


def get_extent_from_sanmiguel() -> tuple[float, float, float, float]:
    """Read default extent from SanMiguel 2/Map/Map.json or from SanMiguel.aprx (Web Mercator)."""
    map_json = SANMIGUEL_DIR / "Map" / "Map.json"
    if map_json.exists():
        with open(map_json, encoding="utf-8") as f:
            data = json.load(f)
    elif APRX_PATH.exists():
        with zipfile.ZipFile(APRX_PATH, "r") as z:
            with z.open("Map/Map.json") as f:
                data = json.load(f)
    else:
        raise FileNotFoundError(
            f"San Miguel project not found. Look for either:\n  {SANMIGUEL_DIR}/Map/Map.json\n  or {APRX_PATH}"
        )
    ext = data.get("defaultExtent") or {}
    return (
        float(ext.get("xmin", -8261396.73)),
        float(ext.get("ymin", 511025.67)),
        float(ext.get("xmax", -8261015.49)),
        float(ext.get("ymax", 511269.49)),
    )


def normalize_land_use(value) -> str:
    """Map Building layer Type_of_Pr (or similar) to Residential|Commercial|Mixed-use."""
    if value is None:
        return random.choice(LAND_USE_VALUES)
    s = str(value).strip().lower()
    if not s:
        return random.choice(LAND_USE_VALUES)
    if s in ("residential", "res", "r", "house", "housing"):
        return "Residential"
    if s in ("commercial", "comm", "c", "retail", "office"):
        return "Commercial"
    if s in ("mixed", "mixed-use", "mixed_use", "mixed use", "m"):
        return "Mixed-use"
    if s.startswith("r"):
        return "Residential"
    if s.startswith("c"):
        return "Commercial"
    if s.startswith("m"):
        return "Mixed-use"
    return random.choice(LAND_USE_VALUES)


def load_parcels_from_shapefile() -> list[dict] | None:
    """Load parcels from Building.shp in SanMiguel 2 or data/ if present."""
    shp_path = _find_building_shp()
    if not shp_path:
        return None
    try:
        import shapefile
    except ImportError:
        print("Install pyshp to load Building.shp: pip install pyshp")
        return None

    parcels = []
    with shapefile.Reader(str(shp_path)) as shp:
        fields = [f[0] for f in shp.fields[1:]]
        for i, (shape, record) in enumerate(zip(shp.shapes(), shp.records())):
            rec = dict(zip(fields, record))
            if shape.shapeType in (shapefile.POINT, shapefile.POINTM, shapefile.POINTZ):
                x, y = shape.points[0][0], shape.points[0][1]
            else:
                bbox = shape.bbox
                x = (bbox[0] + bbox[2]) / 2.0
                y = (bbox[1] + bbox[3]) / 2.0
            lat, lng = web_mercator_to_wgs84(x, y)
            parcel_id = str(rec.get("Address") or rec.get("FID") or f"B-{i+1:04d}").strip() or f"B-{i+1:04d}"
            population = int(rec.get("of_Pepl") or rec.get("population") or 0)
            population = max(0, min(10000, population))
            land_use = normalize_land_use(rec.get("Type_of_Pr") or rec.get("land_use") or rec.get("Land_Use"))
            parcels.append({
                "parcel_id": parcel_id[:32],
                "land_use": land_use,
                "population": population if population > 0 else random.randint(2, 10),
                "lat": round(lat, 6),
                "lng": round(lng, 6),
            })
    return parcels if parcels else None


def load_parcels_from_csv() -> list[dict] | None:
    """Load parcels from SanMiguel 2/parcels.csv if present."""
    if not PARCELS_CSV.exists():
        return None
    parcels = []
    with open(PARCELS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            d = {k.strip().lower().replace(" ", "_"): v for k, v in row.items()}
            pid = str(d.get("parcel_id") or d.get("id") or "").strip()
            if not pid:
                continue
            try:
                land_use = normalize_land_use(d.get("land_use") or d.get("landuse"))
                population = max(0, min(10000, int(float(d.get("population") or d.get("pop") or 0))))
                lat = float(d.get("lat") or d.get("latitude") or 0)
                lng = float(d.get("lng") or d.get("lon") or d.get("longitude") or 0)
            except (ValueError, TypeError):
                continue
            parcels.append({
                "parcel_id": pid[:32],
                "land_use": land_use,
                "population": population,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
            })
    return parcels if parcels else None


def write_parcels_csv(parcels: list[dict]) -> None:
    """Write parcel data to SanMiguel 2/parcels.csv."""
    SANMIGUEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(PARCELS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["parcel_id", "land_use", "population", "lat", "lng"])
        w.writeheader()
        w.writerows(parcels)
    print(f"Wrote {len(parcels)} parcels to {PARCELS_CSV}")


def generate_synthetic_parcels_in_extent(count: int = 380) -> list[dict]:
    """Generate synthetic building parcels in the San Miguel map extent."""
    xmin, ymin, xmax, ymax = get_extent_from_sanmiguel()
    cx = (xmin + xmax) / 2.0
    cy = (ymin + ymax) / 2.0
    lat_center, lng_center = web_mercator_to_wgs84(cx, cy)
    width_m = xmax - xmin
    height_m = ymax - ymin
    lat_span = height_m / 111320
    lng_span = width_m / (111320 * math.cos(math.radians(lat_center)))

    parcels = []
    for i in range(1, count + 1):
        lat = lat_center + (random.random() - 0.5) * lat_span
        lng = lng_center + (random.random() - 0.5) * lng_span
        land_use = random.choice(LAND_USE_VALUES)
        population = random.randint(2, 15) if land_use == "Residential" else random.randint(2, 25)
        parcels.append({
            "parcel_id": f"P-{i:04d}",
            "land_use": land_use,
            "population": population,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    return parcels


async def seed_db(parcels: list[dict]) -> None:
    """Insert parcels into the app database."""
    from sqlalchemy import delete
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    from app.config import get_settings
    from app.database import Base
    from app.models.parcel import Parcel

    settings = get_settings()
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(db_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await session.execute(delete(Parcel))
        await session.commit()
        for p in parcels:
            session.add(Parcel(**p))
        await session.commit()
    await engine.dispose()


def main():
    parcels = load_parcels_from_shapefile()
    shp_path = _find_building_shp()
    if parcels:
        print(f"Loaded {len(parcels)} parcels from {shp_path}")
    else:
        parcels = load_parcels_from_csv()
        if parcels:
            print(f"Loaded {len(parcels)} parcels from {PARCELS_CSV}")
        else:
            print("No Building.shp or parcels.csv found. Using map extent from San Miguel 2/Map/Map.json to create initial parcels.")
            xmin, ymin, xmax, ymax = get_extent_from_sanmiguel()
            lat_c, lng_c = web_mercator_to_wgs84((xmin + xmax) / 2, (ymin + ymax) / 2)
            print(f"Map center (WGS84): {lat_c:.4f}, {lng_c:.4f}")
            parcels = generate_synthetic_parcels_in_extent(380)
    write_parcels_csv(parcels)
    asyncio.run(seed_db(parcels))
    print(f"Seeded {len(parcels)} parcels. Restart or refresh the app to see data.")


if __name__ == "__main__":
    main()
