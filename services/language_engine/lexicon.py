"""Licensed-resource boundary and bundled original seed lexicon."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

from .normalization import normalize_for_lookup


class DictionaryProvider(Protocol):
    """Adapter boundary for future verified Hunspell or licensed dictionaries."""

    @property
    def source_name(self) -> str: ...

    def contains(self, word: str) -> bool: ...

    def frequency(self, word: str) -> int: ...

    def words(self) -> set[str]: ...


@dataclass(slots=True)
class SeedLexicon:
    frequencies: dict[str, int]
    misspellings: dict[str, str]
    english_words: set[str]
    split_compounds: dict[str, str]
    formal_replacements: dict[str, str]
    lexical_entries: dict[str, dict[str, Any]]
    terminology: dict[str, dict[str, Any]]
    source_name: str = "Skryfwys original seed lexicon"
    _words: set[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._words = set(self.frequencies)
        self._words.update(self.terminology)
        self._words.update(self.misspellings.values())
        self._words.update(self.formal_replacements)
        self._words.update(self.english_words)
        for replacement in self.formal_replacements.values():
            self._words.update(normalize_for_lookup(replacement).split())
        for phrase in self.terminology:
            self._words.update(phrase.split())

    def contains(self, word: str) -> bool:
        return normalize_for_lookup(word) in self._words

    def frequency(self, word: str) -> int:
        return self.frequencies.get(normalize_for_lookup(word), 500)

    def words(self) -> set[str]:
        return set(self._words)

    def is_terminology(self, word: str) -> bool:
        return normalize_for_lookup(word) in self.terminology


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return value


@lru_cache(maxsize=1)
def load_seed_lexicon() -> SeedLexicon:
    """Load only the repository's original, documented seed resources."""

    data_root = _repository_root() / "data" / "dictionaries"
    words_data = _load_json(data_root / "seed_words.json")
    terms_data = _load_json(data_root / "seed_terminology.json")
    terminology: dict[str, dict[str, Any]] = {}
    for record in terms_data.get("terms", []):
        term = normalize_for_lookup(str(record["term"]))
        terminology[term] = dict(record)

    return SeedLexicon(
        frequencies={normalize_for_lookup(k): int(v) for k, v in words_data["words"].items()},
        misspellings={
            normalize_for_lookup(k): normalize_for_lookup(v)
            for k, v in words_data.get("misspellings", {}).items()
        },
        english_words={normalize_for_lookup(item) for item in words_data.get("english_words", [])},
        split_compounds={
            normalize_for_lookup(k): normalize_for_lookup(v)
            for k, v in words_data.get("split_compounds", {}).items()
        },
        formal_replacements={
            normalize_for_lookup(k): str(v)
            for k, v in words_data.get("formal_replacements", {}).items()
        },
        lexical_entries={
            normalize_for_lookup(k): dict(v)
            for k, v in words_data.get("lexical_entries", {}).items()
        },
        terminology=terminology,
    )
