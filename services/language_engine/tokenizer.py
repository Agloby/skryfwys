"""Offset-preserving tokenization for Afrikaans prose."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum


class TokenKind(StrEnum):
    WORD = "word"
    URL = "url"
    EMAIL = "email"
    NUMBER = "number"
    PUNCTUATION = "punctuation"


# Ordering matters: protected structured values are consumed before words or
# punctuation.  Python's Unicode-aware \w gives correct behavior for Afrikaans
# diacritics without an external regex dependency.
TOKEN_PATTERN = re.compile(
    r"(?P<url>(?:https?://|www\.)[^\s<>]+)"
    r"|(?P<email>[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+)"
    r"|(?P<number>(?:(?:R|€|\$|£)\s?)?\d+(?:[ .,'’]\d+)*(?:[.,]\d+)?(?:\s?(?:%|°C|°F|mm|cm|km|kg|mg|ml|m²|m³|ha))?)"
    r"|(?P<word>(?:[^\W\d_][\u0300-\u036f]*)+(?:['’](?:[^\W\d_][\u0300-\u036f]*)+)*(?:-(?:[^\W\d_][\u0300-\u036f]*)+)*)"
    r"|(?P<punctuation>[^\w\s])",
    flags=re.UNICODE | re.IGNORECASE,
)


@dataclass(frozen=True, slots=True)
class Token:
    text: str
    start: int
    end: int
    kind: TokenKind


def tokenize(text: str) -> list[Token]:
    """Tokenize *text* while retaining half-open offsets into the original."""

    tokens: list[Token] = []
    for match in TOKEN_PATTERN.finditer(text):
        group = match.lastgroup
        if group is None:
            continue
        tokens.append(
            Token(
                text=match.group(),
                start=match.start(),
                end=match.end(),
                kind=TokenKind(group),
            )
        )
    return tokens


def word_tokens(text: str) -> list[Token]:
    return [token for token in tokenize(text) if token.kind is TokenKind.WORD]


def sentence_ranges(text: str) -> list[tuple[int, int]]:
    """Return conservative sentence ranges including trailing punctuation."""

    ranges: list[tuple[int, int]] = []
    start = 0
    for match in re.finditer(r"[.!?]+(?=\s|$)", text):
        end = match.end()
        if text[start:end].strip():
            ranges.append((start, end))
        start = end
    if text[start:].strip():
        ranges.append((start, len(text)))
    return ranges
