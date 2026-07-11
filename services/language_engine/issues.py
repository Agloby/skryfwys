"""Issue construction, identity, ordering, and invariant checks."""

from __future__ import annotations

import hashlib

from .models import Issue, IssueType, Severity, Suggestion, SuggestionSource


def make_issue(
    text: str,
    *,
    rule_id: str,
    issue_type: IssueType,
    severity: Severity,
    message_af: str,
    message_en: str | None,
    start: int,
    end: int,
    confidence: float,
    replacements: list[tuple[str, float, SuggestionSource]] | None = None,
) -> Issue:
    """Build an issue and enforce exact-original/half-open offset invariants."""

    if not 0 <= start <= end <= len(text):
        raise ValueError(f"Invalid issue offsets {start}:{end} for {len(text)} code points")
    original = text[start:end]
    identity = f"{rule_id}\0{start}\0{end}\0{original}".encode()
    issue_id = f"{rule_id.lower()}-{hashlib.sha256(identity).hexdigest()[:16]}"
    suggestions = [
        Suggestion(text=value, confidence=score, source=source)
        for value, score, source in (replacements or [])
        if value != original
    ]
    issue = Issue(
        id=issue_id,
        type=issue_type,
        severity=severity,
        message_af=message_af,
        message_en=message_en,
        offset_start=start,
        offset_end=end,
        original=original,
        suggestions=suggestions,
        rule_id=rule_id,
        confidence=confidence,
    )
    if text[issue.offset_start : issue.offset_end] != issue.original:
        raise AssertionError("Issue original text does not match its offsets")
    return issue


def deduplicate_and_sort(issues: list[Issue]) -> list[Issue]:
    """Return deterministic issues, keeping the strongest exact-range finding."""

    by_key: dict[tuple[str, int, int, str], Issue] = {}
    for issue in issues:
        key = (issue.rule_id, issue.offset_start, issue.offset_end, issue.original)
        incumbent = by_key.get(key)
        if incumbent is None or issue.confidence > incumbent.confidence:
            by_key[key] = issue
    return sorted(
        by_key.values(),
        key=lambda issue: (issue.offset_start, issue.offset_end, issue.rule_id, issue.id),
    )
