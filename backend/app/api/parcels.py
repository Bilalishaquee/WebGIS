from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.parcel import Parcel
from app.schemas.parcel import ParcelResponse, ParcelUpdate, ParcelCreate, ParcelListResponse
from app.services.consumption import compute_parcel_consumption
from app.services.import_parcels import parse_csv, parse_json
from app.api.deps import get_current_user_id
import json

router = APIRouter(prefix="/parcels", tags=["parcels"])


def _parcel_to_response(p: Parcel) -> ParcelResponse:
    c = compute_parcel_consumption(p.population, p.land_use)
    return ParcelResponse(
        id=p.id,
        parcel_id=p.parcel_id,
        land_use=p.land_use,
        population=p.population,
        lat=p.lat,
        lng=p.lng,
        daily90=c["daily90"],
        daily100=c["daily100"],
        yearly90=c["yearly90"],
        yearly100=c["yearly100"],
    )


@router.get("", response_model=ParcelListResponse)
async def list_parcels(
    land_use: str | None = None,
    skip: int = 0,
    limit: int = 500,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    q = select(Parcel)
    if land_use and land_use != "All":
        q = q.where(Parcel.land_use == land_use)
    count_q = select(func.count(Parcel.id))
    if land_use and land_use != "All":
        count_q = count_q.where(Parcel.land_use == land_use)
    total = (await db.execute(count_q)).scalar() or 0
    q = q.offset(skip).limit(limit)
    r = await db.execute(q)
    parcels = list(r.scalars().all())
    return ParcelListResponse(
        parcels=[_parcel_to_response(p) for p in parcels],
        total=total,
    )


@router.post("", response_model=ParcelResponse, status_code=201)
async def create_parcel(
    data: ParcelCreate,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """Create a single parcel manually. parcel_id must be unique."""
    r = await db.execute(select(Parcel).where(Parcel.parcel_id == data.parcel_id))
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Parcel ID already exists")
    p = Parcel(
        parcel_id=data.parcel_id.strip(),
        land_use=data.land_use,
        population=data.population,
        lat=data.lat,
        lng=data.lng,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _parcel_to_response(p)


@router.get("/{parcel_id}", response_model=ParcelResponse)
async def get_parcel(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    r = await db.execute(select(Parcel).where(Parcel.parcel_id == parcel_id))
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return _parcel_to_response(p)


@router.patch("/{parcel_id}", response_model=ParcelResponse)
async def update_parcel(
    parcel_id: str,
    data: ParcelUpdate,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    r = await db.execute(select(Parcel).where(Parcel.parcel_id == parcel_id))
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if data.land_use is not None:
        p.land_use = data.land_use
    if data.population is not None:
        p.population = data.population
    if data.lat is not None:
        p.lat = data.lat
    if data.lng is not None:
        p.lng = data.lng
    await db.commit()
    await db.refresh(p)
    return _parcel_to_response(p)


@router.post("/upload")
async def upload_parcels(
    file: UploadFile = File(...),
    replace_all: bool = False,
    db: AsyncSession = Depends(get_db),
    _user_id: int = Depends(get_current_user_id),
):
    """
    Upload CSV or JSON/GeoJSON to import parcels.
    CSV/JSON: parcel_id, land_use, population, lat, lng.
    replace_all: if True, delete existing parcels then import; else upsert by parcel_id.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    content = (await file.read()).decode("utf-8", errors="replace")
    filename_lower = file.filename.lower()

    try:
        if filename_lower.endswith(".csv"):
            rows = parse_csv(content)
        elif filename_lower.endswith(".json") or filename_lower.endswith(".geojson"):
            rows = parse_json(content)
        else:
            raise HTTPException(status_code=400, detail="File must be .csv, .json, or .geojson")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    if not rows:
        raise HTTPException(status_code=400, detail="No valid parcel records in file")

    if replace_all:
        await db.execute(Parcel.__table__.delete())
        await db.commit()

    inserted = 0
    updated = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            existing = (await db.execute(select(Parcel).where(Parcel.parcel_id == row["parcel_id"]))).scalar_one_or_none()
            if existing:
                existing.land_use = row["land_use"]
                existing.population = row["population"]
                existing.lat = row["lat"]
                existing.lng = row["lng"]
                updated += 1
            else:
                db.add(
                    Parcel(
                        parcel_id=row["parcel_id"],
                        land_use=row["land_use"],
                        population=row["population"],
                        lat=row["lat"],
                        lng=row["lng"],
                    )
                )
                inserted += 1
        except Exception as e:
            errors.append(f"Row {i + 1} ({row.get('parcel_id', '?')}): {e}")

    await db.commit()

    return {
        "ok": True,
        "inserted": inserted,
        "updated": updated,
        "total": inserted + updated,
        "errors": errors[:20],
        "message": f"Imported {inserted + updated} parcels ({inserted} new, {updated} updated)."
        + (f" {len(errors)} row(s) had errors." if errors else ""),
    }
