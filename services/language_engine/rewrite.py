"""Safe deterministic rewrite fallback for every public rewrite mode."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .engine import LanguageEngine
from .models import (
    CheckRequest,
    DocumentMode,
    IssueType,
    RewriteChange,
    RewriteMode,
    RewriteRequest,
    RewriteResponse,
)
from .normalization import match_case

PROTECTED_PATTERN = re.compile(
    r"(?:https?://|www\.)[^\s<>]+"
    r"|[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+"
    r"|(?:R|€|\$|£)\s?\d+(?:[ .,'’]\d+)*(?:[.,]\d+)?"
    r"|\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b"
    r"|\b\d+(?:[.,]\d+)?\s?(?:%|°C|°F|mm|cm|km|kg|mg|ml|m²|m³|ha)\b",
    re.IGNORECASE | re.UNICODE,
)
QUOTED_PATTERN = re.compile(r"([\"“‘]).*?([\"”’])", re.DOTALL)


@dataclass(slots=True)
class ProtectedText:
    text: str
    values: dict[str, str]

    def restore(self, value: str) -> str:
        for placeholder, original in self.values.items():
            value = value.replace(placeholder, original)
        return value


def _protect(text: str, preserve_quotes: bool) -> ProtectedText:
    spans = [match.span() for match in PROTECTED_PATTERN.finditer(text)]
    if preserve_quotes:
        spans.extend(match.span() for match in QUOTED_PATTERN.finditer(text))
    # Merge overlap, then replace from right to left using identifiers that are
    # deliberately unlikely to occur in user prose.
    merged: list[tuple[int, int]] = []
    for start, end in sorted(spans):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    values: dict[str, str] = {}
    protected = text
    for index, (start, end) in reversed(list(enumerate(merged))):
        placeholder = f"SKRYFWYSPROTECTED{index:04d}TOKEN"
        values[placeholder] = text[start:end]
        protected = protected[:start] + placeholder + protected[end:]
    return ProtectedText(protected, values)


def _replace_phrases(
    text: str,
    replacements: dict[str, str],
    *,
    explanation: str,
    kind: str,
) -> tuple[str, list[RewriteChange]]:
    changes: list[RewriteChange] = []
    for source, target in sorted(replacements.items(), key=lambda item: -len(item[0])):
        pattern = re.compile(r"(?<!\w)" + re.escape(source) + r"(?!\w)", re.IGNORECASE)

        def replace(match: re.Match[str], replacement_target: str = target) -> str:
            replacement = match_case(replacement_target, match.group())
            changes.append(
                RewriteChange(
                    kind=kind,
                    original=match.group(),
                    replacement=replacement,
                    explanation_af=explanation,
                )
            )
            return replacement

        text = pattern.sub(replace, text)
    return text, changes


def _apply_safe_corrections(
    text: str,
    engine: LanguageEngine,
    request: RewriteRequest,
) -> tuple[str, list[RewriteChange]]:
    changes: list[RewriteChange] = []
    current = text
    for _ in range(2):
        response = engine.check_text(
            CheckRequest(
                text=current,
                privacy_mode=request.privacy_mode,
                document_mode=DocumentMode.GENERAL,
                custom_terms=request.custom_terms,
            )
        )
        candidates = [
            issue
            for issue in response.issues
            if issue.suggestions
            and issue.suggestions[0].confidence >= 0.9
            and issue.type in {IssueType.SPELLING, IssueType.GRAMMAR, IssueType.PUNCTUATION}
        ]
        selected: list = []
        for issue in sorted(candidates, key=lambda item: (-item.confidence, item.offset_start)):
            if any(
                not (
                    issue.offset_end <= other.offset_start or issue.offset_start >= other.offset_end
                )
                for other in selected
            ):
                continue
            selected.append(issue)
        if not selected:
            break
        for issue in sorted(selected, key=lambda item: item.offset_start, reverse=True):
            replacement = issue.suggestions[0].text
            current = current[: issue.offset_start] + replacement + current[issue.offset_end :]
            changes.append(
                RewriteChange(
                    kind="correction",
                    original=issue.original,
                    replacement=replacement,
                    explanation_af=issue.message_af,
                    source=issue.suggestions[0].source,
                )
            )
    changes.reverse()
    return current, changes


MODE_REPLACEMENTS: dict[RewriteMode, dict[str, str]] = {
    RewriteMode.CLEARER: {
        "met betrekking tot": "oor",
        "op hierdie stadium": "nou",
        "ten einde": "om",
        "in die geval dat": "as",
    },
    RewriteMode.CONCISE: {
        "as gevolg van die feit dat": "omdat",
        "dit is belangrik om daarop te let dat": "let daarop dat",
        "met betrekking tot": "oor",
        "op 'n daaglikse basis": "daagliks",
        "op hierdie stadium": "nou",
        "ten einde": "om",
    },
    RewriteMode.FRIENDLY: {
        "geagte": "hallo",
        "vriendelike groete": "mooi loop",
    },
    RewriteMode.PROFESSIONAL_EMAIL: {
        "hi": "goeiedag",
        "okay": "goed",
        "asb": "asseblief",
    },
    RewriteMode.ACADEMIC: {
        "baie": "aansienlik",
        "wys": "toon",
        "kyk na": "ondersoek",
        "asb": "asseblief",
    },
    RewriteMode.PLAIN_LANGUAGE: {
        "met betrekking tot": "oor",
        "op hierdie stadium": "nou",
        "ten einde": "om",
        "derhalwe": "daarom",
        "nieteenstaande": "ondanks",
    },
    RewriteMode.INFORMAL: {
        "asseblief": "asb",
        "goeiedag": "hallo",
    },
    RewriteMode.TRANSLATE_EN_AF: {
        "please": "asseblief",
        "thank you": "dankie",
        "good morning": "goeiemôre",
        "document": "dokument",
        "project": "projek",
        "report": "verslag",
        "send": "stuur",
        "today": "vandag",
        "tomorrow": "môre",
        "the": "die",
        "and": "en",
    },
    RewriteMode.TRANSLATE_AF_EN: {
        "asseblief": "please",
        "dankie": "thank you",
        "goeiemôre": "good morning",
        "dokument": "document",
        "projek": "project",
        "verslag": "report",
        "stuur": "send",
        "vandag": "today",
        "môre": "tomorrow",
        "die": "the",
        "en": "and",
    },
}


def rewrite_text(request: RewriteRequest, engine: LanguageEngine | None = None) -> RewriteResponse:
    """Rewrite with local deterministic transformations and protected values.

    Translation modes intentionally cover only the transparent seed phrase
    table.  Unknown wording is left intact rather than guessed.
    """

    language_engine = engine or LanguageEngine()
    rewritten, changes = _apply_safe_corrections(request.text, language_engine, request)
    protected = _protect(rewritten, request.preserve_quotes)
    working = protected.text

    if request.mode in {RewriteMode.FORMAL, RewriteMode.PROFESSIONAL_EMAIL, RewriteMode.ACADEMIC}:
        working, formal_changes = _replace_phrases(
            working,
            language_engine.lexicon.formal_replacements,
            explanation="'n Formeler alternatief is gebruik.",
            kind="formality",
        )
        changes.extend(formal_changes)

    replacements = MODE_REPLACEMENTS.get(request.mode, {})
    if replacements:
        explanation = {
            RewriteMode.CLEARER: "Die formulering is direkter gemaak.",
            RewriteMode.CONCISE: "'n Omslagtige frase is verkort.",
            RewriteMode.FRIENDLY: "Die toon is vriendeliker gemaak.",
            RewriteMode.PROFESSIONAL_EMAIL: "Die e-postoon is professioneel gemaak.",
            RewriteMode.ACADEMIC: "'n Akademieser alternatief is gebruik.",
            RewriteMode.PLAIN_LANGUAGE: "'n Eenvoudiger alternatief is gebruik.",
            RewriteMode.INFORMAL: "'n Informeler alternatief is gebruik.",
            RewriteMode.TRANSLATE_EN_AF: "'n Bekende Engelse seedterm is na Afrikaans vertaal.",
            RewriteMode.TRANSLATE_AF_EN: "'n Bekende Afrikaanse seedterm is na Engels vertaal.",
        }[request.mode]
        working, mode_changes = _replace_phrases(
            working,
            replacements,
            explanation=explanation,
            kind=request.mode.value,
        )
        changes.extend(mode_changes)

    rewritten = protected.restore(working)
    applied_changes = [change.explanation_af for change in changes]
    return RewriteResponse(
        original_text=request.text,
        rewritten_text=rewritten,
        mode=request.mode,
        applied_changes=applied_changes,
        changes=changes,
    )
