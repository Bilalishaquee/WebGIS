from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database: use SQLite by default (no Docker). For PostGIS set DATABASE_URL to postgres.
    DATABASE_URL: str = "sqlite+aiosqlite:///./water_demand.db"
    # PostgreSQL+PostGIS example: postgresql+psycopg2://user:pass@localhost:5432/water_demand

    # Auth
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:3001, https://web-gis-pi.vercel.app"

    # Consumption model (L per capita per day)
    DEFAULT_L_PER_CAPITA_LOW: int = 90
    DEFAULT_L_PER_CAPITA_HIGH: int = 100

    # Chatbot (OpenAI). Leave empty to disable chat API; frontend will use keyword fallback.
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
