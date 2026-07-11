"""Deterministic Afrikaans language checking and rewriting.

The package deliberately has no dependency on an external AI provider.  Its
public functions are safe to use in local-only applications.
"""

from .engine import LanguageEngine, check_text, lookup_word, suggest_word
from .models import (
    CheckRequest,
    CheckResponse,
    DocumentMode,
    Issue,
    IssueType,
    LookupRequest,
    LookupResponse,
    PrivacyMode,
    RewriteMode,
    RewriteRequest,
    RewriteResponse,
    Severity,
    Suggestion,
    SuggestWordRequest,
    SuggestWordResponse,
)
from .rewrite import rewrite_text

__all__ = [
    "CheckRequest",
    "CheckResponse",
    "DocumentMode",
    "Issue",
    "IssueType",
    "LanguageEngine",
    "LookupRequest",
    "LookupResponse",
    "PrivacyMode",
    "RewriteMode",
    "RewriteRequest",
    "RewriteResponse",
    "Severity",
    "Suggestion",
    "SuggestWordRequest",
    "SuggestWordResponse",
    "check_text",
    "lookup_word",
    "rewrite_text",
    "suggest_word",
]
