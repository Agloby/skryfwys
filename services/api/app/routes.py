"""Version-neutral API routes included under canonical and compatibility prefixes."""

from __future__ import annotations

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from services.language_engine import (
    CheckRequest,
    CheckResponse,
    LanguageEngine,
    LookupRequest,
    LookupResponse,
    RewriteRequest,
    RewriteResponse,
    SuggestWordRequest,
    SuggestWordResponse,
)
from services.language_engine.models import CustomTermInput, CustomTermRecord
from services.language_engine.rewrite import rewrite_text as deterministic_rewrite
from services.language_engine.rules import rule_catalog
from services.language_engine.tokenizer import TokenKind, tokenize
from services.model_gateway import ModelGateway

from .config import Settings
from .database import CustomTermRepository, Database
from .schemas import (
    CustomTermImport,
    CustomTermList,
    DeleteResponse,
    DiagnosticsResponse,
    HealthResponse,
)

router = APIRouter()
UserId = Annotated[str, Query(min_length=1, max_length=128)]


def get_session(request: Request):
    database: Database = request.app.state.database
    with database.session_factory() as session:
        yield session


SessionDependency = Annotated[Session, Depends(get_session)]


def _records_for_user(session: Session, user_id: str) -> list[CustomTermRecord]:
    return CustomTermRepository(session).list(user_id)


def _terms_for_text(records: list[CustomTermRecord], text: str) -> set[str]:
    token_values = {token.text for token in tokenize(text) if token.kind is TokenKind.WORD}
    terms: set[str] = set()
    for record in records:
        if record.case_sensitive and record.term not in token_values and record.term not in text:
            continue
        terms.add(record.term)
        if " " in record.term:
            terms.update(record.term.split())
    return terms


@router.get("/health", response_model=HealthResponse, tags=["system"])
def versioned_health() -> HealthResponse:
    return HealthResponse()


@router.get("/diagnostics", response_model=DiagnosticsResponse, tags=["system"])
def diagnostics(request: Request, session: SessionDependency) -> DiagnosticsResponse:
    settings: Settings = request.app.state.settings
    if not settings.diagnostics_enabled:
        raise HTTPException(status_code=404, detail="Diagnostics are disabled")
    database_status = "ok"
    try:
        session.execute(select(1)).scalar_one()
    except Exception:  # pragma: no cover - database driver-specific failure surface
        database_status = "unavailable"
    gateway: ModelGateway = request.app.state.model_gateway
    return DiagnosticsResponse(
        status="ok" if database_status == "ok" else "degraded",
        environment=settings.environment,
        deterministic_engine=True,
        database=database_status,
        ai_provider_configured=gateway.provider is not None,
        max_request_bytes=settings.max_request_bytes,
        rate_limit=f"{settings.rate_limit_requests}/{settings.rate_limit_window_seconds}s",
    )


@router.get("/rules", tags=["language"])
def list_rules() -> dict[str, object]:
    items = rule_catalog()
    return {"items": items, "count": len(items)}


@router.post("/check", response_model=CheckResponse, tags=["language"])
def check_text(
    request: Request, payload: CheckRequest, session: SessionDependency
) -> CheckResponse:
    records = _records_for_user(session, payload.user_id)
    personal_terms = _terms_for_text(records, payload.text)
    enriched = payload.model_copy(update={"custom_terms": payload.custom_terms | personal_terms})
    engine: LanguageEngine = request.app.state.language_engine
    return engine.check_text(enriched)


@router.post("/suggest", response_model=SuggestWordResponse, tags=["language"])
def suggest_word(
    request: Request,
    payload: SuggestWordRequest,
    session: SessionDependency,
) -> SuggestWordResponse:
    records = _records_for_user(session, payload.user_id)
    personal_terms = _terms_for_text(records, payload.word)
    enriched = payload.model_copy(update={"custom_terms": payload.custom_terms | personal_terms})
    engine: LanguageEngine = request.app.state.language_engine
    return engine.suggest_word(enriched)


@router.post("/rewrite", response_model=RewriteResponse, tags=["language"])
async def rewrite_text(
    request: Request,
    payload: RewriteRequest,
    session: SessionDependency,
) -> RewriteResponse:
    records = _records_for_user(session, payload.user_id)
    personal_terms = _terms_for_text(records, payload.text)
    enriched = payload.model_copy(update={"custom_terms": payload.custom_terms | personal_terms})
    engine: LanguageEngine = request.app.state.language_engine
    deterministic = deterministic_rewrite(enriched, engine)
    gateway: ModelGateway = request.app.state.model_gateway
    return await gateway.rewrite(enriched, deterministic)


@router.post("/lookup", response_model=LookupResponse, tags=["language"])
def lookup_word(
    request: Request,
    payload: LookupRequest,
    session: SessionDependency,
) -> LookupResponse:
    repository = CustomTermRepository(session)
    records = repository.list(payload.user_id)
    personal_terms = _terms_for_text(records, payload.word)
    enriched = payload.model_copy(update={"custom_terms": payload.custom_terms | personal_terms})
    engine: LanguageEngine = request.app.state.language_engine
    response = engine.lookup_word(enriched)
    personal = repository.find(payload.user_id, payload.word)
    if personal is not None:
        sources = [
            "User personal dictionary",
            *[item for item in response.sources if item != "User personal dictionary"],
        ]
        response = response.model_copy(
            update={
                "meaning": personal.definition,
                "meaning_source": "user-provided" if personal.definition else None,
                "related_terms": sorted(set(response.related_terms + personal.alternatives)),
                "sources": sources,
            }
        )
    return response


@router.post(
    "/custom-terms",
    response_model=CustomTermRecord,
    status_code=status.HTTP_201_CREATED,
    tags=["personal-dictionary"],
)
def add_custom_term(payload: CustomTermInput, session: SessionDependency) -> CustomTermRecord:
    return CustomTermRepository(session).upsert(payload)


@router.get("/custom-terms", response_model=CustomTermList, tags=["personal-dictionary"])
def list_custom_terms(session: SessionDependency, user_id: UserId = "guest") -> CustomTermList:
    items = CustomTermRepository(session).list(user_id)
    return CustomTermList(items=items, count=len(items))


@router.post(
    "/custom-terms/import",
    response_model=CustomTermList,
    tags=["personal-dictionary"],
)
def import_custom_terms(payload: CustomTermImport, session: SessionDependency) -> CustomTermList:
    values = [term.model_copy(update={"user_id": payload.user_id}) for term in payload.terms]
    items = CustomTermRepository(session).import_many(values)
    return CustomTermList(items=items, count=len(items))


@router.post(
    "/custom-terms/import.csv",
    response_model=CustomTermList,
    tags=["personal-dictionary"],
)
async def import_custom_terms_csv(
    request: Request,
    session: SessionDependency,
    user_id: UserId = "guest",
) -> CustomTermList:
    body = await request.body()
    try:
        decoded = body.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))
        values: list[CustomTermInput] = []
        for row in reader:
            alternatives_value = row.get("alternatives", "")
            alternatives = [item.strip() for item in alternatives_value.split(";") if item.strip()]
            values.append(
                CustomTermInput(
                    term=row.get("term", ""),
                    preferred=row.get("preferred", "true").casefold() not in {"false", "0", "no"},
                    case_sensitive=row.get("case_sensitive", "false").casefold()
                    in {"true", "1", "yes"},
                    category=row.get("category") or "general",
                    alternatives=alternatives,
                    definition=row.get("definition") or None,
                    notes=row.get("notes") or None,
                    source=row.get("source") or "user",
                    locale=row.get("locale") or "af-ZA",
                    user_id=user_id,
                )
            )
    except (UnicodeDecodeError, csv.Error, ValidationError) as exc:
        raise HTTPException(status_code=422, detail="Invalid custom-term CSV") from exc
    if not values:
        raise HTTPException(status_code=422, detail="CSV contains no terms")
    if len(values) > 2_000:
        raise HTTPException(status_code=422, detail="CSV contains too many terms")
    items = CustomTermRepository(session).import_many(values)
    return CustomTermList(items=items, count=len(items))


def _csv_safe(value: object) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.startswith(("=", "+", "-", "@")) else text


@router.get("/custom-terms/export", tags=["personal-dictionary"])
def export_custom_terms(
    session: SessionDependency,
    user_id: UserId = "guest",
    format: Annotated[str, Query(pattern="^(json|csv)$")] = "json",
) -> Response:
    items = CustomTermRepository(session).list(user_id)
    if format == "json":
        return JSONResponse([item.model_dump(mode="json") for item in items])
    output = io.StringIO(newline="")
    fieldnames = [
        "term",
        "preferred",
        "case_sensitive",
        "category",
        "alternatives",
        "definition",
        "notes",
        "source",
        "locale",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for item in items:
        row = item.model_dump(include=set(fieldnames))
        row["alternatives"] = ";".join(item.alternatives)
        writer.writerow({key: _csv_safe(value) for key, value in row.items()})
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="skryfwys-custom-terms.csv"'},
    )


@router.delete(
    "/custom-terms/{term_id}",
    response_model=DeleteResponse,
    tags=["personal-dictionary"],
)
def delete_custom_term(
    term_id: int, session: SessionDependency, user_id: UserId = "guest"
) -> DeleteResponse:
    deleted = CustomTermRepository(session).delete(user_id, term_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Custom term not found")
    return DeleteResponse(deleted=True)
