"""Deterministic spelling decisions and multi-signal candidate ranking."""

from __future__ import annotations

import math
from dataclasses import dataclass

from .lexicon import SeedLexicon
from .models import Suggestion, SuggestionSource
from .normalization import match_case, normalize_for_lookup, strip_diacritics

KEYBOARD_ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
KEY_POSITIONS = {
    character: (row_index, column_index)
    for row_index, row in enumerate(KEYBOARD_ROWS)
    for column_index, character in enumerate(row)
}


def damerau_levenshtein(left: str, right: str, max_distance: int | None = None) -> int:
    """Return optimal-string-alignment edit distance with optional early bound."""

    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)
    if max_distance is not None and abs(len(left) - len(right)) > max_distance:
        return max_distance + 1

    previous_previous: list[int] | None = None
    previous = list(range(len(right) + 1))
    for left_index, left_char in enumerate(left, start=1):
        current = [left_index]
        row_minimum = left_index
        for right_index, right_char in enumerate(right, start=1):
            cost = 0 if left_char == right_char else 1
            value = min(
                current[right_index - 1] + 1,
                previous[right_index] + 1,
                previous[right_index - 1] + cost,
            )
            if (
                previous_previous is not None
                and left_index > 1
                and right_index > 1
                and left_char == right[right_index - 2]
                and left[left_index - 2] == right_char
            ):
                value = min(value, previous_previous[right_index - 2] + 1)
            current.append(value)
            row_minimum = min(row_minimum, value)
        if max_distance is not None and row_minimum > max_distance:
            return max_distance + 1
        previous_previous, previous = previous, current
    return previous[-1]


def keyboard_similarity(left: str, right: str) -> float:
    """Score whether a one-character substitution is keyboard-adjacent."""

    if len(left) != len(right):
        return 0.0
    differences = [(a, b) for a, b in zip(left, right, strict=True) if a != b]
    if len(differences) != 1:
        return 0.0
    a, b = differences[0]
    if a not in KEY_POSITIONS or b not in KEY_POSITIONS:
        return 0.0
    ar, ac = KEY_POSITIONS[a]
    br, bc = KEY_POSITIONS[b]
    return 1.0 if abs(ar - br) <= 1 and abs(ac - bc) <= 1 else 0.0


@dataclass(frozen=True, slots=True)
class SpellingDecision:
    correct: bool
    reason: str


class SpellChecker:
    """Conservative seed-dictionary checker.

    Unknown words are only flagged when a credible close candidate exists.
    This is important while the bundled vocabulary remains deliberately small.
    """

    def __init__(self, lexicon: SeedLexicon) -> None:
        self.lexicon = lexicon

    def is_correct(self, word: str, custom_terms: set[str] | None = None) -> SpellingDecision:
        key = normalize_for_lookup(word)
        custom = {normalize_for_lookup(term) for term in (custom_terms or set())}
        if key in custom:
            return SpellingDecision(True, "custom-term")
        if self.lexicon.contains(key):
            return SpellingDecision(True, "dictionary")
        if "-" in key and all(
            self._known_or_morphological(part, custom) for part in key.split("-")
        ):
            return SpellingDecision(True, "hyphenated")
        if self._known_or_morphological(key, custom):
            return SpellingDecision(True, "morphological")
        return SpellingDecision(False, "unknown")

    def _known_or_morphological(self, key: str, custom: set[str]) -> bool:
        if key in custom or self.lexicon.contains(key):
            return True
        if len(key) < 5:
            return False
        prefixes = ("ge", "her", "on", "be", "ver")
        suffixes = ("e", "en", "er", "ers", "s", "se", "heid", "ing", "lik", "loos")
        for prefix in prefixes:
            if key.startswith(prefix) and len(key) - len(prefix) >= 4:
                if self.lexicon.contains(key[len(prefix) :]):
                    return True
        for suffix in suffixes:
            if key.endswith(suffix) and len(key) - len(suffix) >= 4:
                stem = key[: -len(suffix)]
                if self.lexicon.contains(stem) or self.lexicon.contains(stem + "e"):
                    return True
        return False

    def suggestions(
        self,
        word: str,
        *,
        custom_terms: set[str] | None = None,
        maximum: int = 5,
    ) -> list[Suggestion]:
        key = normalize_for_lookup(word)
        custom = {normalize_for_lookup(term) for term in (custom_terms or set())}
        explicit = self.lexicon.misspellings.get(key)
        if explicit:
            return [
                Suggestion(
                    text=match_case(explicit, word),
                    confidence=0.98,
                    source=SuggestionSource.DICTIONARY,
                )
            ]

        candidates = self.lexicon.words() | custom
        # Candidate generation is bounded by length before edit distance.  The
        # seed vocabulary is small, while this remains scalable to user lists.
        max_distance = 1 if len(key) <= 5 else 2
        ranked: list[tuple[float, str, SuggestionSource]] = []
        for candidate in candidates:
            if abs(len(candidate) - len(key)) > max_distance or " " in candidate:
                continue
            distance = damerau_levenshtein(key, candidate, max_distance)
            diacritic_match = strip_diacritics(key) == strip_diacritics(candidate)
            if distance > max_distance and not diacritic_match:
                continue
            edit_score = 1.0 - (distance / max(len(key), len(candidate), 1))
            keyboard_bonus = keyboard_similarity(key, candidate) * 0.05
            frequency_bonus = min(math.log10(self.lexicon.frequency(candidate) + 1) / 100, 0.04)
            diacritic_bonus = 0.12 if diacritic_match and key != candidate else 0.0
            custom_bonus = 0.04 if candidate in custom else 0.0
            score = min(
                0.97,
                0.45
                + (edit_score * 0.45)
                + keyboard_bonus
                + frequency_bonus
                + diacritic_bonus
                + custom_bonus,
            )
            source = (
                SuggestionSource.CUSTOM_TERM if candidate in custom else SuggestionSource.DICTIONARY
            )
            ranked.append((score, candidate, source))

        ranked.sort(key=lambda item: (-item[0], -self.lexicon.frequency(item[1]), item[1]))
        return [
            Suggestion(text=match_case(candidate, word), confidence=round(score, 3), source=source)
            for score, candidate, source in ranked[:maximum]
        ]

    def split_suggestion(self, word: str) -> str | None:
        key = normalize_for_lookup(word)
        if len(key) < 6:
            return None
        for index in range(3, len(key) - 2):
            left, right = key[:index], key[index:]
            if self.lexicon.contains(left) and self.lexicon.contains(right):
                return f"{left} {right}"
        return None
