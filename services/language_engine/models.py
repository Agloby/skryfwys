"""Typed contracts shared by the deterministic language engine and API."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_TEXT_CHARACTERS = 50_000
MAX_WORD_CHARACTERS = 128


class StrictModel(BaseModel):
    """Base model that rejects misspelled or unexpected request fields."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class PrivacyMode(StrEnum):
    LOCAL = "local"
    PRIVATE_SERVER = "private-server"
    CLOUD_AI = "cloud-ai"


class DocumentMode(StrEnum):
    GENERAL = "general"
    FORMAL = "formal"
    INFORMAL = "informal"
    ACADEMIC = "academic"
    PROFESSIONAL = "professional"


class IssueType(StrEnum):
    SPELLING = "spelling"
    GRAMMAR = "grammar"
    PUNCTUATION = "punctuation"
    STYLE = "style"
    TERMINOLOGY = "terminology"
    CLARITY = "clarity"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class SuggestionSource(StrEnum):
    DICTIONARY = "dictionary"
    RULE = "rule"
    LANGUAGE_MODEL = "language-model"
    CUSTOM_TERM = "custom-term"


class Suggestion(StrictModel):
    text: str = Field(min_length=1, max_length=256)
    confidence: float = Field(ge=0.0, le=1.0)
    source: SuggestionSource


class Issue(StrictModel):
    id: str = Field(min_length=8, max_length=64)
    type: IssueType
    severity: Severity
    message_af: str
    message_en: str | None = None
    offset_start: int = Field(ge=0)
    offset_end: int = Field(ge=0)
    original: str
    suggestions: list[Suggestion] = Field(default_factory=list, max_length=8)
    rule_id: str = Field(pattern=r"^AF_[A-Z0-9_]+$")
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("offset_end")
    @classmethod
    def end_must_be_nonnegative(cls, value: int) -> int:
        return value


class CheckRequest(StrictModel):
    text: str = Field(max_length=MAX_TEXT_CHARACTERS)
    privacy_mode: PrivacyMode = PrivacyMode.LOCAL
    document_mode: DocumentMode = DocumentMode.GENERAL
    disabled_rules: set[str] = Field(default_factory=set, max_length=100)
    rule_severity: dict[str, Severity] = Field(default_factory=dict)
    ignore_words: set[str] = Field(default_factory=set, max_length=500)
    custom_terms: set[str] = Field(default_factory=set, max_length=5_000)
    user_id: str = Field(default="guest", min_length=1, max_length=128)
    max_suggestions: int = Field(default=5, ge=1, le=8)


class CheckResponse(StrictModel):
    text: str
    privacy_mode: PrivacyMode
    issues: list[Issue]
    issue_count: int = Field(ge=0)
    processing_time_ms: float = Field(ge=0.0)
    language: str = "af-ZA"


class SuggestWordRequest(StrictModel):
    word: str = Field(min_length=1, max_length=MAX_WORD_CHARACTERS)
    context: str | None = Field(default=None, max_length=2_000)
    custom_terms: set[str] = Field(default_factory=set, max_length=5_000)
    max_suggestions: int = Field(default=5, ge=1, le=8)
    user_id: str = Field(default="guest", min_length=1, max_length=128)


class SuggestWordResponse(StrictModel):
    word: str
    correct: bool
    normalized: str
    suggestions: list[Suggestion]


class RewriteMode(StrEnum):
    CORRECT_ONLY = "correct-only"
    CLEARER = "clearer"
    CONCISE = "concise"
    FORMAL = "formal"
    FRIENDLY = "friendly"
    PROFESSIONAL_EMAIL = "professional-email"
    ACADEMIC = "academic"
    PLAIN_LANGUAGE = "plain-language"
    INFORMAL = "informal"
    PRESERVE_WORDING = "preserve-wording"
    TRANSLATE_EN_AF = "translate-en-af"
    TRANSLATE_AF_EN = "translate-af-en"


class RewriteRequest(StrictModel):
    text: str = Field(max_length=MAX_TEXT_CHARACTERS)
    mode: RewriteMode
    privacy_mode: PrivacyMode = PrivacyMode.LOCAL
    user_id: str = Field(default="guest", min_length=1, max_length=128)
    preserve_quotes: bool = True
    custom_terms: set[str] = Field(default_factory=set, max_length=5_000)


class RewriteChange(StrictModel):
    kind: str
    original: str
    replacement: str
    explanation_af: str
    source: SuggestionSource = SuggestionSource.RULE


class RewriteResponse(StrictModel):
    original_text: str
    rewritten_text: str
    mode: RewriteMode
    applied_changes: list[str]
    changes: list[RewriteChange]
    provider: str = "deterministic"
    ai_used: bool = False


class LookupRequest(StrictModel):
    word: str = Field(min_length=1, max_length=MAX_WORD_CHARACTERS)
    user_id: str = Field(default="guest", min_length=1, max_length=128)
    custom_terms: set[str] = Field(default_factory=set, max_length=5_000)


class LexicalGuidance(StrictModel):
    text: str
    label: str = "project-authored-language-guidance"
    source: str = "Skryfwys seed lexicon"


class LookupResponse(StrictModel):
    word: str
    normalized: str
    spelling_status: str
    suggestions: list[Suggestion]
    part_of_speech: str | None = None
    meaning: str | None = None
    meaning_source: str | None = None
    guidance: LexicalGuidance | None = None
    synonyms: list[str] = Field(default_factory=list)
    antonyms: list[str] = Field(default_factory=list)
    formal_alternatives: list[str] = Field(default_factory=list)
    informal_alternatives: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list)
    compounds: list[str] = Field(default_factory=list)
    related_terms: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class CustomTermInput(StrictModel):
    term: str = Field(min_length=1, max_length=128)
    preferred: bool = True
    case_sensitive: bool = False
    category: str = Field(default="general", min_length=1, max_length=64)
    alternatives: list[str] = Field(default_factory=list, max_length=20)
    definition: str | None = Field(default=None, max_length=1_000)
    notes: str | None = Field(default=None, max_length=1_000)
    source: str = Field(default="user", max_length=128)
    locale: str = Field(default="af-ZA", pattern=r"^[a-z]{2}(?:-[A-Z]{2})?$")
    user_id: str = Field(default="guest", min_length=1, max_length=128)

    @field_validator("term")
    @classmethod
    def validate_term(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or any(char in cleaned for char in "\r\n\t"):
            raise ValueError("term must be a single non-empty text value")
        return cleaned


class CustomTermRecord(CustomTermInput):
    id: int
    created_at: str
