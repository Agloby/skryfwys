"""Unicode normalization helpers that never mutate source offsets."""

from __future__ import annotations

import unicodedata

APOSTROPHES = str.maketrans({"’": "'", "‘": "'", "`": "'", "ʼ": "'"})
DASHES = str.maketrans({"‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-"})


def normalize_for_lookup(value: str) -> str:
    """Return an NFC, punctuation-canonical, case-insensitive lookup key.

    The checker applies this only to isolated token values.  It does not
    normalize the submitted document, so offsets always refer to the exact
    original Python/Unicode code-point sequence.
    """

    return unicodedata.normalize("NFC", value.translate(APOSTROPHES).translate(DASHES)).casefold()


def strip_diacritics(value: str) -> str:
    """Return a comparison-only representation without combining marks."""

    decomposed = unicodedata.normalize("NFD", normalize_for_lookup(value))
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def match_case(replacement: str, original: str) -> str:
    """Apply the source token's common capitalization pattern."""

    if original.isupper():
        return replacement.upper()
    if original[:1].isupper() and original[1:].islower():
        return replacement[:1].upper() + replacement[1:]
    return replacement
