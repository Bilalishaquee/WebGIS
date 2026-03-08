# San Miguel parcel data

The backend uses the **San Miguel 2** project folder (`WebGIS/SanMiguel 2/`).

## If you only have the San Miguel 2 folder

Run from the backend: `python scripts/seed_sanmiguel.py`. The script reads the map extent from `Map/Map.json`, creates initial parcels, writes `parcels.csv` in the same folder, and seeds the DB. Replace `parcels.csv` later with your own data when you have it.

## Map extent

- The seed script reads the map extent from **`WebGIS/SanMiguel 2/Map/Map.json`** (same structure as an extracted .aprx).
- If no shapefile is found, it generates 380 synthetic parcels in that extent so the web map matches the San Miguel project area.

## Using real Building data (shapefile)

1. Export the **Building** layer from your ArcGIS project as a shapefile (`Building.shp` + .shx, .dbf).
2. Place the files in either:
   - **`WebGIS/SanMiguel 2/Building.shp`** (with .shx, .dbf in the same folder), or  
   - **`WebGIS/data/Building.shp`**
3. From the backend directory run:
   ```bash
   pip install pyshp
   python scripts/seed_sanmiguel.py
   ```

The script maps: **Address** → parcel_id, **of_Pepl** → population, **Type_of_Pr** → land_use, **Shape** → lat/lng (centroid).
