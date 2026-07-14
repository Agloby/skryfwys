"""Licensed-resource boundary, bundled seed lexicon, and verified adapters."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

from .normalization import normalize_for_lookup


class DictionaryProvider(Protocol):
    """Adapter boundary for verified Hunspell or licensed dictionaries."""

    @property
    def source_name(self) -> str: ...

    def contains(self, word: str) -> bool: ...

    def frequency(self, word: str) -> int: ...

    def words(self) -> set[str]: ...


@dataclass(frozen=True, slots=True)
class HunspellWordListProvider:
    """Read a Hunspell ``.dic`` file as a replaceable spelling allow-list.

    This intentionally does not compile the LGPL dictionary into Python source
    and does not hide the upstream files.  Users can replace ``af_ZA.dic`` and
    ``af_ZA.aff`` in ``data/external/hunspell-af-za`` with a compatible modified
    copy, which is the practical requirement for the bundled dictionary data.
    The first integration step uses the base forms in the ``.dic`` file; full
    affix expansion can be added later without changing the provider boundary.
    """

    path: Path
    source_name: str = "LibreOffice Afrikaans Hunspell dictionary (LGPL-2.1-or-later)"
    _words: frozenset[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "_words", frozenset(self._load_words()))

    def _load_words(self) -> set[str]:
        words: set[str] = set()
        with self.path.open(encoding="utf-8") as handle:
            for line_number, raw_line in enumerate(handle):
                line = raw_line.strip()
                if not line:
                    continue
                if line_number == 0 and line.isdecimal():
                    continue
                word = line.split("\t", 1)[0].split("/", 1)[0]
                normalized = normalize_for_lookup(word)
                if normalized:
                    words.add(normalized)
        return words

    def contains(self, word: str) -> bool:
        return normalize_for_lookup(word) in self._words

    def frequency(self, word: str) -> int:
        # Hunspell does not provide frequencies.  Keep it below project-authored
        # high-confidence seed terms so ranking remains deterministic.
        return 100 if self.contains(word) else 0

    def words(self) -> set[str]:
        return set(self._words)


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
    providers: list[DictionaryProvider] = field(default_factory=list)
    ranking_frequencies: dict[str, int] = field(default_factory=dict)
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
        key = normalize_for_lookup(word)
        return key in self._words or any(provider.contains(key) for provider in self.providers)

    def frequency(self, word: str) -> int:
        key = normalize_for_lookup(word)
        corpus_frequency = self.ranking_frequencies.get(key, 0)
        if key in self.frequencies:
            return max(self.frequencies[key], corpus_frequency)
        if corpus_frequency:
            return corpus_frequency
        for provider in self.providers:
            frequency = provider.frequency(key)
            if frequency:
                return frequency
        return 500

    def words(self) -> set[str]:
        # Candidate generation intentionally uses the curated seed/custom terms.
        # The full Hunspell list broadens known-correct coverage, while a future
        # indexed suggester can add fast large-dictionary candidate ranking.
        return set(self._words)

    def is_terminology(self, word: str) -> bool:
        return normalize_for_lookup(word) in self.terminology

    def source_names_for(self, word: str) -> list[str]:
        key = normalize_for_lookup(word)
        sources: list[str] = []
        if key in self._words:
            sources.append(self.source_name)
        for provider in self.providers:
            if provider.contains(key):
                sources.append(provider.source_name)
        return sources


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return value


def load_hunspell_af_za_provider() -> HunspellWordListProvider | None:
    """Load the verified replaceable Afrikaans Hunspell dictionary if present."""

    path = _repository_root() / "data" / "external" / "hunspell-af-za" / "af_ZA.dic"
    if not path.exists():
        return None
    return HunspellWordListProvider(path)


def load_leipzig_ranking_frequencies() -> dict[str, int]:
    """Load cleaned Leipzig frequencies for suggestion ranking only."""

    path = _repository_root() / "data" / "derived" / "leipzig_afrikaans_frequencies.tsv"
    if not path.exists():
        return {}
    frequencies: dict[str, int] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) != 2:
                continue
            word, raw_frequency = parts
            try:
                frequency = int(raw_frequency)
            except ValueError:
                continue
            normalized = normalize_for_lookup(word)
            if normalized and frequency > 0:
                frequencies[normalized] = frequency
    return frequencies


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

    providers: list[DictionaryProvider] = []
    hunspell = load_hunspell_af_za_provider()
    if hunspell is not None:
        providers.append(hunspell)

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
        providers=providers,
        ranking_frequencies=load_leipzig_ranking_frequencies(),
    )
