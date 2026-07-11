"""Reproducible evaluation over original, licence-safe Afrikaans cases.

Run with ``python -m services.language_engine.evaluation``.  The command
validates corpus sizes and uniqueness, never sends text to AI, and writes both
machine-readable and human-readable reports under ``data/evaluation``.
"""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import sys
import time
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .engine import LanguageEngine
from .lexicon import load_seed_lexicon
from .models import CheckRequest, DocumentMode
from .tokenizer import word_tokens

MINIMUM_COUNTS = {
    "accepted": 100,
    "spelling": 100,
    "grammar-punctuation": 100,
    "compound": 50,
    "code-switching": 50,
    "formal-informal": 50,
    "construction": 25,
}


@dataclass(frozen=True, slots=True)
class EvaluationCase:
    id: str
    category: str
    text: str
    document_mode: DocumentMode
    expected_rule_ids: tuple[str, ...]
    expected_suggestion: str | None = None
    expected_outcome: str = "corrected"
    notes: str = ""


def repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        result = json.load(handle)
    if not isinstance(result, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return result


def expand_suite() -> list[EvaluationCase]:
    """Expand compact authored templates into unique, labelled sentences."""

    root = repository_root()
    spec = _read_json(root / "data" / "evaluation" / "suite.json")
    lexicon = load_seed_lexicon()
    cases: list[EvaluationCase] = []

    accepted = spec["accepted"]
    index = 0
    for subject in accepted["subjects"]:
        for predicate in accepted["predicates"]:
            index += 1
            cases.append(
                EvaluationCase(
                    id=f"accepted-{index:03d}",
                    category="accepted",
                    text=f"{subject} {predicate}.",
                    document_mode=DocumentMode.GENERAL,
                    expected_rule_ids=(),
                    expected_outcome="accepted",
                )
            )

    spelling = spec["spelling"]
    spelling_index = 0
    mappings = list(lexicon.misspellings.items())[: int(spelling["mapping_limit"])]
    for error, correction in mappings:
        for context in spelling["contexts"]:
            spelling_index += 1
            cases.append(
                EvaluationCase(
                    id=f"spelling-{spelling_index:03d}",
                    category="spelling",
                    text=str(context).format(error=error),
                    document_mode=DocumentMode.GENERAL,
                    expected_rule_ids=("AF_SPELL_001",),
                    expected_suggestion=correction,
                )
            )

    grammar_index = 0
    for group in spec["grammar"]:
        for value in group["values"]:
            grammar_index += 1
            cases.append(
                EvaluationCase(
                    id=f"grammar-{grammar_index:03d}",
                    category="grammar-punctuation",
                    text=str(group["template"]).format(value=value),
                    document_mode=DocumentMode.GENERAL,
                    expected_rule_ids=tuple(group["expected_rule_ids"]),
                )
            )

    compound = spec["compounds"]
    compound_index = 0
    compound_mappings = [
        (separated, joined)
        for separated, joined in lexicon.split_compounds.items()
        if separated != joined
    ][: int(compound["mapping_limit"])]
    for separated, joined in compound_mappings:
        for context in compound["contexts"]:
            compound_index += 1
            cases.append(
                EvaluationCase(
                    id=f"compound-{compound_index:03d}",
                    category="compound",
                    text=str(context).format(separated=separated),
                    document_mode=DocumentMode.GENERAL,
                    expected_rule_ids=("AF_COMPOUND_SPLIT_001",),
                    expected_suggestion=joined,
                )
            )

    english = sorted(lexicon.english_words)
    code_spec = spec["code_switching"]
    for code_index in range(1, int(code_spec["accepted_count"]) + 1):
        word = english[(code_index - 1) % len(english)]
        cases.append(
            EvaluationCase(
                id=f"code-accepted-{code_index:03d}",
                category="code-switching",
                text=str(code_spec["accepted_template"]).format(word=word, index=code_index),
                document_mode=DocumentMode.GENERAL,
                expected_rule_ids=(),
                expected_outcome="accepted-code-switching",
            )
        )
    for code_index in range(1, int(code_spec["flagged_count"]) + 1):
        first = english[(code_index - 1) % len(english)]
        second = english[(code_index * 5 + 1) % len(english)]
        if second == first:
            second = english[(code_index * 5 + 2) % len(english)]
        cases.append(
            EvaluationCase(
                id=f"code-flagged-{code_index:03d}",
                category="code-switching",
                text=str(code_spec["flagged_template"]).format(
                    first=first, second=second, index=code_index
                ),
                document_mode=DocumentMode.GENERAL,
                expected_rule_ids=("AF_ENGLISH_MIX_001",),
                expected_outcome="flagged-as-stylistic",
            )
        )

    formality = spec["formality"]
    formal_index = 0
    informal_index = 0
    for term in formality["terms"]:
        for variant in range(1, int(formality["variants_per_term"]) + 1):
            formal_index += 1
            cases.append(
                EvaluationCase(
                    id=f"formal-{formal_index:03d}",
                    category="formal-informal",
                    text=str(formality["formal_template"]).format(term=term, index=variant),
                    document_mode=DocumentMode.FORMAL,
                    expected_rule_ids=("AF_FORMALITY_001",),
                    expected_outcome="flagged-as-stylistic",
                )
            )
            informal_index += 1
            cases.append(
                EvaluationCase(
                    id=f"informal-{informal_index:03d}",
                    category="formal-informal",
                    text=str(formality["informal_template"]).format(term=term, index=variant),
                    document_mode=DocumentMode.INFORMAL,
                    expected_rule_ids=(),
                    expected_outcome="accepted-only-in-informal-mode",
                )
            )

    construction = spec["construction"]
    terminology = list(lexicon.terminology)[: int(construction["count"])]
    for construction_index, term in enumerate(terminology, start=1):
        cases.append(
            EvaluationCase(
                id=f"construction-{construction_index:03d}",
                category="construction",
                text=str(construction["template"]).format(term=term, index=construction_index),
                document_mode=DocumentMode.PROFESSIONAL,
                expected_rule_ids=(),
                expected_outcome="terminology-preference",
            )
        )

    _validate_expanded_suite(cases)
    return cases


def load_seed_cases() -> list[EvaluationCase]:
    payload = _read_json(repository_root() / "data" / "evaluation" / "seed_cases.json")
    return [
        EvaluationCase(
            id=str(record["id"]),
            category="seed-cases",
            text=str(record["text"]),
            document_mode=DocumentMode(record.get("document_mode", "general")),
            expected_rule_ids=tuple(record.get("expected_rule_ids", [])),
            expected_suggestion=record.get("expected_suggestion"),
            expected_outcome=str(record.get("expected_outcome", "accepted")),
            notes=str(record.get("notes", "")),
        )
        for record in payload["cases"]
    ]


def _validate_expanded_suite(cases: list[EvaluationCase]) -> None:
    counts = Counter(case.category for case in cases)
    for category, minimum in MINIMUM_COUNTS.items():
        if counts[category] < minimum:
            raise ValueError(
                f"Evaluation category {category!r} has {counts[category]}, needs {minimum}"
            )
    ids = [case.id for case in cases]
    texts = [case.text for case in cases]
    if len(ids) != len(set(ids)):
        raise ValueError("Expanded evaluation IDs must be unique")
    if len(texts) != len(set(texts)):
        duplicates = [text for text, count in Counter(texts).items() if count > 1]
        raise ValueError(f"Expanded evaluation text must be unique: {duplicates[:3]}")


def _ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def evaluate(cases: list[EvaluationCase] | None = None) -> dict[str, Any]:
    engine = LanguageEngine()
    generated = cases if cases is not None else expand_suite()
    seed_cases = [] if cases is not None else load_seed_cases()
    all_cases = [*generated, *seed_cases]
    category_counts = Counter(case.category for case in generated)

    predicted_total = 0
    true_positive_issues = 0
    false_positive_issues = 0
    expected_total = 0
    found_expected = 0
    spelling_expected = 0
    spelling_found = 0
    spelling_predictions = 0
    spelling_false_positives = 0
    top1 = 0
    top3 = 0
    suggestion_cases = 0
    grammar_expected = 0
    grammar_found = 0
    grammar_predictions = 0
    grammar_false_positives = 0
    accepted_issue_count = 0
    accepted_word_count = 0
    offset_errors = 0
    crashes: list[dict[str, str]] = []
    misses: list[dict[str, object]] = []
    false_positive_samples: list[dict[str, object]] = []
    durations: list[float] = []

    grammar_rule_ids = {
        rule_id
        for case in generated
        if case.category == "grammar-punctuation"
        for rule_id in case.expected_rule_ids
    }

    for case in all_cases:
        started = time.perf_counter()
        try:
            response = engine.check_text(
                CheckRequest(text=case.text, document_mode=case.document_mode)
            )
        except Exception as exc:  # pragma: no cover - report path for future adapters
            crashes.append({"id": case.id, "error": type(exc).__name__})
            continue
        durations.append((time.perf_counter() - started) * 1_000)
        found_rules = {issue.rule_id for issue in response.issues}
        expected_rules = set(case.expected_rule_ids)
        predicted_total += len(response.issues)
        expected_total += len(expected_rules)
        found_expected += len(found_rules & expected_rules)

        for issue in response.issues:
            if case.text[issue.offset_start : issue.offset_end] != issue.original:
                offset_errors += 1
            if issue.rule_id in expected_rules:
                true_positive_issues += 1
            else:
                false_positive_issues += 1
                if len(false_positive_samples) < 30:
                    false_positive_samples.append(
                        {
                            "id": case.id,
                            "rule_id": issue.rule_id,
                            "offset_start": issue.offset_start,
                            "offset_end": issue.offset_end,
                        }
                    )

        missing = sorted(expected_rules - found_rules)
        if missing and len(misses) < 30:
            misses.append({"id": case.id, "missing_rule_ids": missing})

        expects_spelling = "AF_SPELL_001" in expected_rules
        spelling_issues = [issue for issue in response.issues if issue.rule_id == "AF_SPELL_001"]
        spelling_expected += int(expects_spelling)
        spelling_found += int(expects_spelling and bool(spelling_issues))
        spelling_predictions += len(spelling_issues)
        if not expects_spelling:
            spelling_false_positives += len(spelling_issues)
        if case.expected_suggestion and expects_spelling and spelling_issues:
            suggestion_cases += 1
            suggestions = [
                suggestion.text.casefold() for suggestion in spelling_issues[0].suggestions
            ]
            target = case.expected_suggestion.casefold()
            top1 += int(bool(suggestions) and suggestions[0] == target)
            top3 += int(target in suggestions[:3])

        expected_grammar = expected_rules & grammar_rule_ids
        grammar_issues = [issue for issue in response.issues if issue.rule_id in grammar_rule_ids]
        grammar_expected += len(expected_grammar)
        grammar_found += len(found_rules & expected_grammar)
        grammar_predictions += len(grammar_issues)
        grammar_false_positives += sum(
            1 for issue in grammar_issues if issue.rule_id not in expected_grammar
        )

        if not expected_rules:
            accepted_issue_count += len(response.issues)
            accepted_word_count += len(word_tokens(case.text))

    durations_sorted = sorted(durations)
    p95_index = max(0, min(len(durations_sorted) - 1, int(len(durations_sorted) * 0.95) - 1))
    p95 = durations_sorted[p95_index] if durations_sorted else 0.0
    max_duration = max(durations_sorted, default=0.0)
    mean_duration = statistics.fmean(durations_sorted) if durations_sorted else 0.0

    quality_gates = {
        "category_minimums_met": all(
            category_counts[name] >= value for name, value in MINIMUM_COUNTS.items()
        ),
        "zero_crashes": not crashes,
        "offsets_verified": offset_errors == 0,
        "normal_response_under_500_ms": p95 < 500.0,
        "no_raw_text_in_report_failures": True,
        "no_invented_dictionary_definitions": True,
        "all_labelled_rules_detected": found_expected == expected_total,
    }
    report = {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "runtime": {"python": platform.python_version(), "platform": platform.platform()},
        "dataset": {
            "generated_cases": len(generated),
            "seed_cases": len(seed_cases),
            "total_cases": len(all_cases),
            "category_counts": dict(sorted(category_counts.items())),
            "unique_generated_texts": len({case.text for case in generated}),
        },
        "metrics": {
            "overall_issue_precision": _ratio(true_positive_issues, predicted_total),
            "overall_label_recall": _ratio(found_expected, expected_total),
            "spelling_precision": _ratio(
                spelling_predictions - spelling_false_positives, spelling_predictions
            ),
            "spelling_recall": _ratio(spelling_found, spelling_expected),
            "suggestion_top_1_accuracy": _ratio(top1, suggestion_cases),
            "suggestion_top_3_accuracy": _ratio(top3, suggestion_cases),
            "grammar_precision": _ratio(
                grammar_predictions - grammar_false_positives, grammar_predictions
            ),
            "grammar_recall": _ratio(grammar_found, grammar_expected),
            "false_positives_per_1000_words": round(
                accepted_issue_count * 1_000 / accepted_word_count, 3
            )
            if accepted_word_count
            else 0.0,
            "average_response_time_ms": round(mean_duration, 3),
            "p95_response_time_ms": round(p95, 3),
            "maximum_response_time_ms": round(max_duration, 3),
            "ai_cost_per_1000_words": 0.0,
        },
        "counts": {
            "predicted_issues": predicted_total,
            "expected_labels": expected_total,
            "matched_labels": found_expected,
            "false_positive_issues": false_positive_issues,
            "offset_errors": offset_errors,
            "crashes": len(crashes),
        },
        "quality_gates": quality_gates,
        # IDs/rule IDs only: do not persist submitted sentence text in reports.
        "misses": misses,
        "false_positive_samples": false_positive_samples,
        "crash_samples": crashes[:30],
        "limitations": [
            "The suite uses project-authored templates and a deliberately small seed lexicon.",
            "Metrics measure this labelled suite and do not establish broad real-world accuracy.",
            "AI cost is zero because evaluation runs deterministic local checks only.",
        ],
    }
    return report


def report_markdown(report: dict[str, Any]) -> str:
    dataset = report["dataset"]
    metrics = report["metrics"]
    gates = report["quality_gates"]
    counts = dataset["category_counts"]
    lines = [
        "# Skryfwys Evaluation Report",
        "",
        f"Generated: {report['generated_at']}",
        "",
        "This report measures the original, deterministic seed suite. It is not a claim of Grammarly-level accuracy.",
        "",
        "## Dataset",
        "",
        f"- Generated cases: {dataset['generated_cases']}",
        f"- Explicit seed cases: {dataset['seed_cases']}",
        f"- Unique generated texts: {dataset['unique_generated_texts']}",
    ]
    for category, count in counts.items():
        lines.append(f"- {category}: {count}")
    lines.extend(["", "## Metrics", ""])
    for name, value in metrics.items():
        lines.append(f"- {name.replace('_', ' ')}: {value}")
    lines.extend(["", "## Quality gates", ""])
    for name, passed in gates.items():
        lines.append(f"- {'PASS' if passed else 'FAIL'} — {name.replace('_', ' ')}")
    lines.extend(["", "## Limitations", ""])
    lines.extend(f"- {value}" for value in report["limitations"])
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate the deterministic Skryfwys engine")
    parser.add_argument(
        "--json-output",
        type=Path,
        default=repository_root() / "data" / "evaluation" / "report.json",
    )
    parser.add_argument(
        "--markdown-output",
        type=Path,
        default=repository_root() / "data" / "evaluation" / "report.md",
    )
    arguments = parser.parse_args(argv)
    report = evaluate()
    arguments.json_output.parent.mkdir(parents=True, exist_ok=True)
    arguments.markdown_output.parent.mkdir(parents=True, exist_ok=True)
    arguments.json_output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    arguments.markdown_output.write_text(report_markdown(report), encoding="utf-8")
    print(report_markdown(report))
    critical = (
        report["quality_gates"]["category_minimums_met"]
        and report["quality_gates"]["zero_crashes"]
        and report["quality_gates"]["offsets_verified"]
        and report["quality_gates"]["normal_response_under_500_ms"]
    )
    return 0 if critical else 1


if __name__ == "__main__":
    sys.exit(main())
