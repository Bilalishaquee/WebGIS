# Backend — Water Demand API

FastAPI backend for the Neighborhood Water Demand Dashboard (proposal Phase 2).

## Features

- **PostgreSQL / SQLite**: Default SQLite for local dev; set `DATABASE_URL` for PostgreSQL+PostGIS.
- **Consumption model**: Cp = Pp × Ld × Kl (parcel daily consumption; optional land-use coefficient).
- **Forecast**: Compound growth projection (Pt = P0(1+r)^t, Ct = Pt × Ld).
- **REST API**: Parcels (list, get, update), summary, land-use breakdown, forecast, scenario comparison.
- **Auth**: JWT (register, login).

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Database & seed

Using default SQLite (`./water_demand.db`):

```bash
# Option A: Seed from actual data (San Miguel 2 or data/)
# Requires parcels.csv in WebGIS/SanMiguel 2/ or Building.shp in SanMiguel 2/ or data/
python scripts/seed_sanmiguel.py

# If you have no data yet: use the app (Data Sources → Upload) or add parcels.csv / Building.shp first.
```

For PostgreSQL, set in `.env`:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/water_demand
```

Then run migrations/create tables (e.g. run the app once or use `init_db`) and run the seed script (after adjusting it to use your DB URL if needed).

## Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

## Docker (backend only)

From the `backend` directory:

```bash
docker build -t water-demand-api .
docker run -p 8000:8000 --env-file .env water-demand-api
```

Or with env vars inline:

```bash
docker run -p 8000:8000 -e SECRET_KEY=your-secret -e CORS_ORIGINS=http://localhost:5173 water-demand-api
```

Optional: mount a SQLite file or set `DATABASE_URL` to a Postgres URL. The image includes `data/SanMiguel2`; run the seed script in a one-off container if needed:

```bash
docker run --rm --env-file .env water-demand-api python scripts/seed_sanmiguel.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register (email, password, name, organization) |
| POST | /auth/login | Login (email, password) |
| GET | /parcels | List parcels (land_use, skip, limit) |
| GET | /parcels/{id} | Get one parcel |
| PATCH | /parcels/{id} | Update parcel (land_use, population, lat, lng) |
| GET | /analytics/summary | Total demand (scenario=90\|100) |
| GET | /analytics/land-use | Land-use breakdown |
| GET | /analytics/forecast | Forecast (growth_rate, years) |
| GET | /analytics/scenario-comparison | 90 L/c vs 100 L/c |

All analytics and parcel consumption values are in **liters**. Frontend converts to m³ for display.

---

## Deploy on Render (backend only)

1. **Create a Web Service**  
   - [Render Dashboard](https://dashboard.render.com) → New → Web Service.  
   - Connect your repo and select it.

2. **Settings**  
   - **Root Directory**: `backend` (or `WebGIS/backend` if your repo root is the parent of `WebGIS`).  
   - **Runtime**: Python.  
   - **Build Command**: `pip install -r requirements.txt`  
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Environment variables** (Render → Service → Environment):  
   - **SECRET_KEY**: Generate a long random string (or use Render’s “Generate” for secret keys).  
   - **CORS_ORIGINS**: Your frontend origin(s), e.g. `https://your-app.onrender.com` or `http://localhost:5173` (comma-separated for several).  
   - **DATABASE_URL** (optional): If you add a PostgreSQL database (New → PostgreSQL), copy its **Internal Database URL** and set `DATABASE_URL` to that.  
     - If you don’t set `DATABASE_URL`, the app uses SQLite; on Render the filesystem is ephemeral, so data is lost on redeploy. For production, use PostgreSQL.

4. **Deploy**  
   - Save; Render will build and run the API.  
   - API URL will be like `https://water-demand-api.onrender.com`.  
   - Docs: `https://your-service.onrender.com/docs`

5. **Seed data**  
   - With PostgreSQL: run the seed script once (e.g. locally with `DATABASE_URL` set to the Render Postgres URL), or implement a one-off job/script that runs against the deployed DB.  
   - Or use the frontend (Data Sources → Upload) after pointing the app at the deployed API (`VITE_API_URL`).

A **render.yaml** is in this folder if you prefer deploying via Render Blueprint; set the Root Directory to this `backend` directory when connecting the repo.

---

## Dataset

The app uses only **actual data**. Parcel data is loaded from (in order):

1. **Backend bundle (for deploy):** `backend/data/SanMiguel2/parcels.csv` and `backend/data/SanMiguel2/Map/Map.json` are included so the backend can seed when deployed (e.g. on Render) without the parent WebGIS folder.
2. **Local dev:** `WebGIS/SanMiguel 2/` — Building.shp, parcels.csv, or Map/Map.json.
3. **Or** upload CSV/JSON via the app (Data Sources → Upload).

Run `python scripts/seed_sanmiguel.py` from the backend directory. No synthetic/dummy data unless no CSV/shp/extent is found (then the script generates initial parcels from map extent).
