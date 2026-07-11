"""Public deterministic language-engine orchestration."""

from __future__ import annotations

import time

from .issues import deduplicate_and_sort, make_issue
from .lexicon import SeedLexicon, load_seed_lexicon
from .models import (
    CheckRequest,
    CheckResponse,
    IssueType,
    LexicalGuidance,
    LookupRequest,
    LookupResponse,
    Severity,
    SuggestWordRequest,
    SuggestWordResponse,
)
from .normalization import normalize_for_lookup
from .rules import run_rules
from .spelling import SpellChecker
from .tokenizer import TokenKind, tokenize


class LanguageEngine:
    """Reusable deterministic checker backed by documented seed resources."""

    def __init__(self, lexicon: SeedLexicon | None = None) -> None:
        self.lexicon = lexicon or load_seed_lexicon()
        self.spelling = SpellChecker(self.lexicon)

    def check_text(self, request: CheckRequest) -> CheckResponse:
        """Check Afrikaans text without making any external network request."""

        started = time.perf_counter()
        text = request.text
        issues = run_rules(
            text,
            lexicon=self.lexicon,
            document_mode=request.document_mode,
            disabled_rules=request.disabled_rules,
            rule_severity=request.rule_severity,
        )
        covered_compounds = [
            (issue.offset_start, issue.offset_end)
            for issue in issues
            if issue.rule_id == "AF_COMPOUND_SPLIT_001"
        ]

        if "AF_SPELL_001" not in request.disabled_rules:
            ignored = {normalize_for_lookup(word) for word in request.ignore_words}
            custom = {normalize_for_lookup(term) for term in request.custom_terms}
            for token in tokenize(text):
                if token.kind is not TokenKind.WORD:
                    continue
                key = normalize_for_lookup(token.text)
                if key in ignored or not self._should_check_token(token.text, key):
                    continue
                if key in custom:
                    # A deliberately approved personal term overrides seed
                    # misspelling knowledge for this request/user.
                    continue
                if any(
                    start <= token.start and token.end <= end for start, end in covered_compounds
                ):
                    continue
                decision = self.spelling.is_correct(token.text, custom)
                explicit = key in self.lexicon.misspellings
                if decision.correct and not explicit:
                    continue
                suggestions = self.spelling.suggestions(
                    token.text,
                    custom_terms=custom,
                    maximum=request.max_suggestions,
                )
                # With a deliberately small licensed-safe seed lexicon, an
                # unknown token alone is not sufficient evidence of an error.
                if not suggestions or (not explicit and suggestions[0].confidence < 0.78):
                    continue
                confidence = suggestions[0].confidence
                issues.append(
                    make_issue(
                        text,
                        rule_id="AF_SPELL_001",
                        issue_type=IssueType.SPELLING,
                        severity=Severity.ERROR if confidence >= 0.9 else Severity.WARNING,
                        message_af="Hierdie woord lyk moontlik verkeerd gespel.",
                        message_en="This word may be misspelled.",
                        start=token.start,
                        end=token.end,
                        confidence=confidence,
                        replacements=[
                            (suggestion.text, suggestion.confidence, suggestion.source)
                            for suggestion in suggestions
                        ],
                    )
                )

        ordered = deduplicate_and_sort(issues)
        for issue in ordered:
            if text[issue.offset_start : issue.offset_end] != issue.original:
                raise AssertionError("Language engine returned an offset/original mismatch")
        elapsed_ms = (time.perf_counter() - started) * 1_000
        return CheckResponse(
            text=text,
            privacy_mode=request.privacy_mode,
            issues=ordered,
            issue_count=len(ordered),
            processing_time_ms=round(elapsed_ms, 3),
        )

    def _should_check_token(self, original: str, key: str) -> bool:
        if not key or len(key) == 1 and key != "'n":
            return False
        if original.isupper() and 1 < len(original) <= 6 and key not in self.lexicon.misspellings:
            return False
        # Capitalized unknown tokens are likely names. Explicit known mistakes
        # remain checkable even when they begin a sentence.
        if original[:1].isupper() and key not in self.lexicon.misspellings:
            return False
        return True

    def suggest_word(self, request: SuggestWordRequest) -> SuggestWordResponse:
        key = normalize_for_lookup(request.word)
        correct = self.spelling.is_correct(request.word, request.custom_terms).correct
        suggestions = (
            []
            if correct
            else self.spelling.suggestions(
                request.word,
                custom_terms=request.custom_terms,
                maximum=request.max_suggestions,
            )
        )
        return SuggestWordResponse(
            word=request.word,
            correct=correct,
            normalized=key,
            suggestions=suggestions,
        )

    def lookup_word(self, request: LookupRequest) -> LookupResponse:
        key = normalize_for_lookup(request.word)
        custom = {normalize_for_lookup(term) for term in request.custom_terms}
        decision = self.spelling.is_correct(request.word, custom)
        suggestions = (
            []
            if decision.correct
            else self.spelling.suggestions(
                request.word,
                custom_terms=custom,
                maximum=5,
            )
        )
        entry = self.lexicon.lexical_entries.get(key, {})
        term_entry = self.lexicon.terminology.get(key, {})
        guidance_text = entry.get("guidance")
        guidance = LexicalGuidance(text=str(guidance_text)) if guidance_text else None
        related_terms: list[str] = []
        compounds: list[str] = []
        for term, record in self.lexicon.terminology.items():
            if key in term.split() or key in term:
                compounds.append(term)
            if key == term:
                related_terms.extend(str(item) for item in record.get("alternatives", []))
        sources = [self.lexicon.source_name] if decision.correct or entry or term_entry else []
        if key in custom:
            sources.insert(0, "User personal dictionary")
        return LookupResponse(
            word=request.word,
            normalized=key,
            spelling_status="custom"
            if key in custom
            else "correct"
            if decision.correct
            else "unknown",
            suggestions=suggestions,
            part_of_speech=entry.get("part_of_speech"),
            meaning=None,
            meaning_source=None,
            guidance=guidance,
            synonyms=[str(item) for item in entry.get("synonyms", [])],
            antonyms=[str(item) for item in entry.get("antonyms", [])],
            formal_alternatives=[str(item) for item in entry.get("formal_alternatives", [])],
            informal_alternatives=[str(item) for item in entry.get("informal_alternatives", [])],
            examples=[str(item) for item in entry.get("examples", [])],
            compounds=sorted(set(compounds))[:20],
            related_terms=sorted(set(related_terms))[:20],
            sources=sources,
        )


_DEFAULT_ENGINE: LanguageEngine | None = None


def _default_engine() -> LanguageEngine:
    global _DEFAULT_ENGINE
    if _DEFAULT_ENGINE is None:
        _DEFAULT_ENGINE = LanguageEngine()
    return _DEFAULT_ENGINE


def check_text(request: CheckRequest) -> CheckResponse:
    """Check text with the process-wide immutable seed lexicon."""

    return _default_engine().check_text(request)


def suggest_word(request: SuggestWordRequest) -> SuggestWordResponse:
    return _default_engine().suggest_word(request)


def lookup_word(request: LookupRequest) -> LookupResponse:
    return _default_engine().lookup_word(request)
