"""API-specific response and bulk-operation contracts."""

from __future__ import annotations

from pydantic import Field

from services.language_engine.models import CustomTermInput, CustomTermRecord, StrictModel


class HealthResponse(StrictModel):
    status: str = "ok"
    service: str = "skryfwys-api"
    version: str = "0.1.0"


class DiagnosticsResponse(StrictModel):
    status: str
    environment: str
    deterministic_engine: bool
    database: str
    ai_provider_configured: bool
    raw_text_logging: bool = False
    max_request_bytes: int
    rate_limit: str


class CustomTermList(StrictModel):
    items: list[CustomTermRecord]
    count: int = Field(ge=0)


class CustomTermImport(StrictModel):
    user_id: str = Field(default="guest", min_length=1, max_length=128)
    terms: list[CustomTermInput] = Field(min_length=1, max_length=2_000)


class DeleteResponse(StrictModel):
    deleted: bool
