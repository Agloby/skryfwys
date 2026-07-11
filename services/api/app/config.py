"""Validated environment configuration."""

from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,https://localhost:3001,https://127.0.0.1:3001"
)


class Settings(BaseSettings):
    """Service settings; secrets never appear in repr or diagnostics."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("SKRYFWYS_ENVIRONMENT", "SKRYFWYS_ENV"),
    )
    database_url: str = Field(
        default="sqlite:///./skryfwys.db",
        validation_alias=AliasChoices("SKRYFWYS_DATABASE_URL", "DATABASE_URL"),
    )
    cors_origins: str = Field(
        default=DEFAULT_CORS_ORIGINS, validation_alias="SKRYFWYS_CORS_ORIGINS"
    )
    trusted_hosts: str = Field(
        default="localhost,127.0.0.1,testserver",
        validation_alias="SKRYFWYS_TRUSTED_HOSTS",
    )
    max_request_bytes: int = Field(
        default=120_000, ge=1_024, le=10_000_000, validation_alias="SKRYFWYS_MAX_REQUEST_BYTES"
    )
    rate_limit_requests: int = Field(
        default=120, ge=1, le=100_000, validation_alias="SKRYFWYS_RATE_LIMIT_REQUESTS"
    )
    rate_limit_window_seconds: int = Field(
        default=60, ge=1, le=3_600, validation_alias="SKRYFWYS_RATE_LIMIT_WINDOW_SECONDS"
    )
    diagnostics_enabled: bool = Field(default=True, validation_alias="SKRYFWYS_DIAGNOSTICS_ENABLED")

    ai_provider: str = Field(default="", validation_alias="AI_PROVIDER")
    ai_model: str = Field(default="", validation_alias="AI_MODEL")
    ai_base_url: str = Field(default="https://api.openai.com", validation_alias="AI_BASE_URL")
    openai_api_key: SecretStr | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    ai_timeout_seconds: float = Field(
        default=20.0, ge=1.0, le=120.0, validation_alias="AI_TIMEOUT_SECONDS"
    )
    ai_max_input_characters: int = Field(
        default=20_000, ge=100, le=50_000, validation_alias="AI_MAX_INPUT_CHARACTERS"
    )
    ai_daily_budget: float = Field(default=0.0, ge=0.0, validation_alias="AI_DAILY_BUDGET")

    @field_validator("database_url")
    @classmethod
    def supported_database(cls, value: str) -> str:
        if not value.startswith(("sqlite:", "postgresql+psycopg:")):
            raise ValueError("Use a sqlite: or postgresql+psycopg: SQLAlchemy URL")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
