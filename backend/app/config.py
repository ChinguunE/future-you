"""Runtime configuration, read from environment variables.

The deployed app needs **no data keys** — it serves committed JSON snapshots.
Only non-secret operational settings live here.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Comma-separated browser origins allowed to call this API (the Vercel site + local dev).
    allowed_origins: str = "http://localhost:3000"
    app_env: str = "development"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so settings are read once, not per request."""
    return Settings()
