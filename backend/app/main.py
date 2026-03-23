from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.api import auth, parcels, analytics, chat
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(parcels.router)
app.include_router(analytics.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
