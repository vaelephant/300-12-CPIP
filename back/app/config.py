from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    SQLite is the default for local development. Production must override
    HCC_CIP_DATABASE_URL with PostgreSQL and a secret JWT key.
    """

    app_name: str = "HCC-CIP API"
    env: str = "dev"
    database_url: str = "sqlite:///./hcc-cip.db"
    jwt_secret: str = "dev-only-change-me-please-32-bytes-minimum-secret"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 480
    auto_create_tables: bool = False

    model_config = SettingsConfigDict(env_prefix="HCC_CIP_", env_file=".env", extra="ignore")

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_dev(self) -> bool:
        return self.env.lower() in {"dev", "test", "local"}


settings = Settings()
