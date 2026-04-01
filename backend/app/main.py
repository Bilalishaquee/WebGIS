from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.api import auth, parcels, analytics, chat, export_report
# Ensure all models are registered with Base before init_db()
from app.models import user as _user, parcel as _parcel  # noqa: F401

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Water Demand API",
    description="Backend for neighborhood water consumption estimation and visualization",
    version="1.0.0",
    lifespan=lifespan,
)

_origins = [x.strip() for x in settings.CORS_ORIGINS.split(",") if x.strip()]
_cors_kw: dict = {
    "allow_origins": _origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
_rx = (settings.CORS_ORIGIN_REGEX or "").strip()
if _rx:
    _cors_kw["allow_origin_regex"] = _rx
app.add_middleware(CORSMiddleware, **_cors_kw)

app.include_router(auth.router)
app.include_router(parcels.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(export_report.router)


@app.get("/health")
def health():
    return {"status": "ok"}
