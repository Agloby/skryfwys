"""SQLAlchemy persistence with SQLite local and PostgreSQL production URLs."""

from __future__ import annotations

import json
import unicodedata
from collections.abc import Generator, Iterable
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    delete,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

from services.language_engine.models import CustomTermInput, CustomTermRecord
from services.language_engine.normalization import normalize_for_lookup


class Base(DeclarativeBase):
    pass


class CustomTermRow(Base):
    __tablename__ = "custom_terms"
    __table_args__ = (UniqueConstraint("user_id", "term_key", name="uq_custom_term_user_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    term: Mapped[str] = mapped_column(String(128))
    term_key: Mapped[str] = mapped_column(String(256), index=True)
    preferred: Mapped[bool] = mapped_column(Boolean, default=True)
    case_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(64), default="general")
    alternatives_json: Mapped[str] = mapped_column(Text, default="[]")
    definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(128), default="user")
    locale: Mapped[str] = mapped_column(String(16), default="af-ZA")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


def make_engine(database_url: str):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite:") else {}
    options: dict[str, object] = {"connect_args": connect_args, "pool_pre_ping": True}
    if database_url in {"sqlite://", "sqlite:///:memory:"}:
        options["poolclass"] = StaticPool
    return create_engine(database_url, **options)


class Database:
    """Own the engine/session lifecycle and custom-term repository operations."""

    def __init__(self, database_url: str) -> None:
        self.engine = make_engine(database_url)
        self.session_factory = sessionmaker(
            bind=self.engine, expire_on_commit=False, class_=Session
        )

    def initialize(self) -> None:
        Base.metadata.create_all(self.engine)

    def close(self) -> None:
        self.engine.dispose()

    def session(self) -> Generator[Session]:
        with self.session_factory() as session:
            yield session


def _term_key(term: str, case_sensitive: bool) -> str:
    normalized = unicodedata.normalize("NFC", term.strip())
    return normalized if case_sensitive else normalize_for_lookup(normalized)


def to_record(row: CustomTermRow) -> CustomTermRecord:
    created = row.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    return CustomTermRecord(
        id=row.id,
        user_id=row.user_id,
        term=row.term,
        preferred=row.preferred,
        case_sensitive=row.case_sensitive,
        category=row.category,
        alternatives=json.loads(row.alternatives_json),
        definition=row.definition,
        notes=row.notes,
        source=row.source,
        locale=row.locale,
        created_at=created.isoformat(),
    )


class CustomTermRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def upsert(self, value: CustomTermInput) -> CustomTermRecord:
        key = _term_key(value.term, value.case_sensitive)
        row = self.session.scalar(
            select(CustomTermRow).where(
                CustomTermRow.user_id == value.user_id,
                CustomTermRow.term_key == key,
            )
        )
        if row is None:
            row = CustomTermRow(user_id=value.user_id, term_key=key, term=value.term)
            self.session.add(row)
        row.term = value.term
        row.preferred = value.preferred
        row.case_sensitive = value.case_sensitive
        row.category = value.category
        row.alternatives_json = json.dumps(value.alternatives, ensure_ascii=False)
        row.definition = value.definition
        row.notes = value.notes
        row.source = value.source
        row.locale = value.locale
        self.session.commit()
        self.session.refresh(row)
        return to_record(row)

    def list(self, user_id: str) -> list[CustomTermRecord]:
        rows = self.session.scalars(
            select(CustomTermRow)
            .where(CustomTermRow.user_id == user_id)
            .order_by(CustomTermRow.term_key, CustomTermRow.id)
        ).all()
        return [to_record(row) for row in rows]

    def find(self, user_id: str, term: str) -> CustomTermRecord | None:
        key = normalize_for_lookup(term)
        rows = self.session.scalars(
            select(CustomTermRow).where(CustomTermRow.user_id == user_id)
        ).all()
        for row in rows:
            candidate = row.term if row.case_sensitive else normalize_for_lookup(row.term)
            expected = term if row.case_sensitive else key
            if candidate == expected:
                return to_record(row)
        return None

    def delete(self, user_id: str, term_id: int) -> bool:
        result = self.session.execute(
            delete(CustomTermRow).where(
                CustomTermRow.user_id == user_id,
                CustomTermRow.id == term_id,
            )
        )
        self.session.commit()
        return bool(result.rowcount)

    def import_many(self, values: Iterable[CustomTermInput]) -> list[CustomTermRecord]:
        return [self.upsert(value) for value in values]
