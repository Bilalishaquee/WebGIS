# San Miguel 2 data (shipped with backend for deploy)

This folder contains a copy of the San Miguel 2 parcel data so the backend can seed the database when deployed (e.g. on Render) without depending on the parent WebGIS folder.

- `parcels.csv` — parcel list (parcel_id, land_use, population, lat, lng)
- `Map/Map.json` — map extent used if generating synthetic parcels

The seed script (`scripts/seed_sanmiguel.py`) uses this folder first; if missing, it falls back to `WebGIS/SanMiguel 2/` for local development.
