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
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174"
    login_max_failures: int = 5
    login_window_seconds: int = 300

    model_config = SettingsConfigDict(env_prefix="HCC_CIP_", env_file=".env", extra="ignore")

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_dev(self) -> bool:
        return self.env.lower() in {"dev", "test", "local"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        """Refuse unsafe production configuration.

        Development and test environments intentionally keep SQLite and demo
        credentials; anything else must be explicitly hardened.
        """
        if self.is_dev:
            return
        if self.jwt_secret == "dev-only-change-me-please-32-bytes-minimum-secret" or len(self.jwt_secret) < 32:
            raise RuntimeError("production JWT secret must be set and at least 32 bytes")
        if self.is_sqlite:
            raise RuntimeError("production requires PostgreSQL, not SQLite")
        if self.auto_create_tables:
            raise RuntimeError("production must use Alembic migrations, not auto-create tables")
        if "*" in self.cors_origin_list:
            raise RuntimeError("production CORS origins must be an explicit allowlist")


settings = Settings()
