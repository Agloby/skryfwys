"""Build a conservative Afrikaans frequency table from Leipzig corpus data.

The generated table is for ranking only.  It deliberately keeps frequencies
only for words already accepted by the project seed lexicon or the verified
Hunspell adapter, so noisy corpus-only tokens do not become spelling allow-list
entries.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from services.language_engine.lexicon import load_seed_lexicon  # noqa: E402
from services.language_engine.normalization import normalize_for_lookup  # noqa: E402


def build_frequency_table(source: Path, target: Path, *, minimum_frequency: int) -> int:
    lexicon = load_seed_lexicon()
    frequencies: dict[str, int] = {}

    with source.open(encoding="utf-8") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) != 3:
                continue
            _, raw_word, raw_frequency = parts
            try:
                frequency = int(raw_frequency)
            except ValueError:
                continue
            if frequency < minimum_frequency:
                continue
            word = normalize_for_lookup(raw_word)
            if not word or len(word) < 2:
                continue
            if not all(character.isalpha() or character in {"'", "-"} for character in word):
                continue
            if not lexicon.contains(word):
                continue
            frequencies[word] = frequencies.get(word, 0) + frequency

    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("# word\tfrequency\n")
        for word, frequency in sorted(frequencies.items(), key=lambda item: (-item[1], item[0])):
            handle.write(f"{word}\t{frequency}\n")
    return len(frequencies)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--target", required=True, type=Path)
    parser.add_argument("--minimum-frequency", default=2, type=int)
    args = parser.parse_args()
    count = build_frequency_table(
        args.source,
        args.target,
        minimum_frequency=args.minimum_frequency,
    )
    print(f"Wrote {count} ranked frequency entries to {args.target}")


if __name__ == "__main__":
    main()
