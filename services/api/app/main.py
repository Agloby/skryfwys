"""FastAPI application factory for Skryfwys."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from services.language_engine import LanguageEngine
from services.model_gateway import MockRewriteProvider, ModelGateway, OpenAIResponsesProvider

from .config import Settings, get_settings
from .database import Database
from .middleware import RateLimitMiddleware, RequestSizeLimitMiddleware, SecurityAndAuditMiddleware
from .routes import router
from .schemas import HealthResponse


def _provider_from_settings(settings: Settings):
    provider = settings.ai_provider.strip().casefold()
    # Zero is the safe default: external calls remain disabled until a user or
    # operator sets both a provider and a positive explicit daily budget.
    if not provider or settings.ai_daily_budget <= 0:
        return None
    if provider == "mock":
        return MockRewriteProvider()
    if provider in {"openai", "openai-compatible"}:
        secret = settings.openai_api_key.get_secret_value() if settings.openai_api_key else ""
        return OpenAIResponsesProvider(
            base_url=settings.ai_base_url,
            api_key=secret,
            model=settings.ai_model,
            timeout_seconds=settings.ai_timeout_seconds,
            max_input_characters=settings.ai_max_input_characters,
        )
    raise ValueError(f"Unsupported AI_PROVIDER: {settings.ai_provider}")


def create_app(
    settings: Settings | None = None,
    *,
    database: Database | None = None,
    language_engine: LanguageEngine | None = None,
    model_gateway: ModelGateway | None = None,
) -> FastAPI:
    """Create an independently configurable application for production or tests."""

    resolved = settings or get_settings()
    db = database or Database(resolved.database_url)
    engine = language_engine or LanguageEngine()
    gateway = model_gateway or ModelGateway(
        _provider_from_settings(resolved),
        max_input_characters=resolved.ai_max_input_characters,
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        db.initialize()
        yield
        db.close()

    application = FastAPI(
        title="Skryfwys API",
        version="0.1.0",
        description=(
            "Privacy-conscious deterministic Afrikaans checking with optional opt-in AI rewriting. "
            "Offsets are half-open Unicode code-point offsets into the exact submitted text."
        ),
        lifespan=lifespan,
    )
    application.state.settings = resolved
    application.state.database = db
    application.state.language_engine = engine
    application.state.model_gateway = gateway

    application.add_middleware(TrustedHostMiddleware, allowed_hosts=resolved.trusted_host_list)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
        max_age=600,
    )
    application.add_middleware(
        RateLimitMiddleware,
        requests=resolved.rate_limit_requests,
        window_seconds=resolved.rate_limit_window_seconds,
    )
    application.add_middleware(SecurityAndAuditMiddleware)
    application.add_middleware(RequestSizeLimitMiddleware, max_bytes=resolved.max_request_bytes)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        # FastAPI's default errors may echo the invalid input. Return locations
        # and messages only so submitted private prose is never reflected.
        errors = [
            {key: value for key, value in error.items() if key in {"loc", "msg", "type"}}
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    @application.get("/health", response_model=HealthResponse, tags=["system"])
    def health() -> HealthResponse:
        return HealthResponse()

    application.include_router(router, prefix="/api/v1")
    application.include_router(router, prefix="/api", include_in_schema=False)
    return application


app = create_app()
