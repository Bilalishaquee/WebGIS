"""
Parse CSV or JSON/GeoJSON file into list of parcel dicts.
Expected fields: parcel_id, land_use, population, lat, lng.
land_use must be one of: Residential, Commercial, Mixed-use.
"""
import csv
import json
from io import StringIO
from typing import Any

VALID_LAND_USE = {"Residential", "Commercial", "Mixed-use"}


def _normalize_land_use(s: str) -> str:
    v = (s or "").strip()
    if not v:
        raise ValueError("land_use is required")
    # Allow common variants
    lower = v.lower()
    if lower in ("residential", "res"):
        return "Residential"
    if lower in ("commercial", "comm"):
        return "Commercial"
    if lower in ("mixed-use", "mixed_use", "mixed use", "mixed"):
        return "Mixed-use"
    if v in VALID_LAND_USE:
        return v
    raise ValueError(f"land_use must be one of Residential, Commercial, Mixed-use; got {v!r}")


def _row_to_parcel(row: dict[str, Any]) -> dict[str, Any]:
    """Convert a row dict to normalized parcel dict."""
    pid = str(row.get("parcel_id") or row.get("id") or "").strip()
    if not pid:
        raise ValueError("parcel_id is required")
    land_use = _normalize_land_use(str(row.get("land_use") or row.get("landUse") or ""))
    pop = row.get("population")
    if pop is None:
        pop = row.get("pop")
    try:
        population = int(float(pop)) if pop is not None else 0
    except (TypeError, ValueError):
        raise ValueError(f"population must be a number; got {pop!r}")
    if population < 0 or population > 10000:
        raise ValueError(f"population must be 0–10000; got {population}")
    try:
        lat = float(row.get("lat") or row.get("latitude") or 0)
        lng = float(row.get("lng") or row.get("lon") or row.get("longitude") or 0)
    except (TypeError, ValueError):
        raise ValueError(f"lat/lng must be numbers; got lat={row.get('lat')}, lng={row.get('lng')}")
    if not (-90 <= lat <= 90):
        raise ValueError(f"lat must be -90 to 90; got {lat}")
    if not (-180 <= lng <= 180):
        raise ValueError(f"lng must be -180 to 180; got {lng}")
    return {
        "parcel_id": pid[:32],
        "land_use": land_use,
        "population": population,
        "lat": lat,
        "lng": lng,
    }


def parse_csv(content: str) -> list[dict[str, Any]]:
    """Parse CSV string. First row = headers. Columns: parcel_id, land_use, population, lat, lng (names case-insensitive)."""
    reader = csv.DictReader(StringIO(content))
    rows = list(reader)
    if not rows:
        return []
    # Normalize header keys to lowercase for lookup
    normalized = []
    for row in rows:
        d = {k.strip().lower().replace(" ", "_"): v for k, v in row.items()}
        # Map common column names
        if "parcel_id" not in d and "id" in d:
            d["parcel_id"] = d["id"]
        if "land_use" not in d and "landuse" in d:
            d["land_use"] = d["landuse"]
        if "population" not in d and "pop" in d:
            d["population"] = d["pop"]
        if "lat" not in d and "latitude" in d:
            d["lat"] = d["latitude"]
        if "lng" not in d and "longitude" in d:
            d["lng"] = d["longitude"]
        if "lng" not in d and "lon" in d:
            d["lng"] = d["lon"]
        normalized.append(d)
    return [_row_to_parcel(r) for r in normalized]


def parse_json(content: str) -> list[dict[str, Any]]:
    """Parse JSON array or GeoJSON FeatureCollection into list of parcel dicts."""
    data = json.loads(content)
    parcels = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                if item.get("type") == "Feature" and "geometry" in item and "properties" in item:
                    props = item["properties"]
                    geom = item["geometry"]
                    if geom.get("type") == "Point" and geom.get("coordinates"):
                        coords = geom["coordinates"]
                        props["lng"] = coords[0]
                        props["lat"] = coords[1]
                    parcels.append(_row_to_parcel(props))
                else:
                    parcels.append(_row_to_parcel(item))
    elif isinstance(data, dict) and data.get("type") == "FeatureCollection":
        for f in data.get("features", []):
            if f.get("type") != "Feature" or "properties" not in f:
                continue
            props = dict(f["properties"])
            geom = f.get("geometry")
            if geom and geom.get("type") == "Point" and geom.get("coordinates"):
                props["lng"] = geom["coordinates"][0]
                props["lat"] = geom["coordinates"][1]
            parcels.append(_row_to_parcel(props))
    else:
        raise ValueError("JSON must be an array of parcel objects or a GeoJSON FeatureCollection")
    return parcels
