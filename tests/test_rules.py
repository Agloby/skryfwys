from __future__ import annotations

import pytest

from services.language_engine import CheckRequest, LanguageEngine
from services.language_engine.rules import RULES, rule_catalog


@pytest.mark.parametrize(
    ("text", "rule_id"),
    [
        ("Dit dit is reg.", "AF_REPEAT_WORD_001"),
        ("Dit is reg!!!", "AF_REPEAT_PUNCT_001"),
        ("Ja , dit is reg.", "AF_SPACE_BEFORE_PUNCT_001"),
        ("Ja,dit is reg.", "AF_SPACE_AFTER_PUNCT_001"),
        ("Hy sê: “ woord ”.", "AF_QUOTE_SPACE_001"),
        ("die dokument is gereed.", "AF_SENTENCE_CAP_001"),
        ("Ons sal die werk nie voltooi.", "AF_NEGATION_001"),
        ("Ons sal nie dit voltooi nie.", "AF_WORD_ORDER_001"),
        ("Ek het gister gaan.", "AF_PAST_TENSE_001"),
        ("Ons hersien die koste beraming.", "AF_COMPOUND_SPLIT_001"),
        ("Ons email die report en vra feedback.", "AF_ENGLISH_MIX_001"),
        ("Die werk word vandag deur die span voltooi.", "AF_PASSIVE_001"),
        ("Die projek kos €2,500,000.", "AF_NUMBER_FORMAT_001"),
        ("Die pakket weeg 10kg.", "AF_MEASUREMENT_SPACE_001"),
    ],
)
def test_positive_rules(text: str, rule_id: str) -> None:
    response = LanguageEngine().check_text(CheckRequest(text=text))
    assert rule_id in {issue.rule_id for issue in response.issues}


def test_formality_rule_is_mode_sensitive() -> None:
    engine = LanguageEngine()
    formal = engine.check_text(CheckRequest(text="Stuur asb die dokument.", document_mode="formal"))
    informal = engine.check_text(
        CheckRequest(text="Stuur asb die dokument.", document_mode="informal")
    )
    assert "AF_FORMALITY_001" in {issue.rule_id for issue in formal.issues}
    assert "AF_FORMALITY_001" not in {issue.rule_id for issue in informal.issues}


@pytest.mark.parametrize(
    "text",
    [
        "Ons sal dit nie môre kan voltooi nie.",
        "Ek het 'n plan om môre te gaan.",
        "Ek het gister na die winkel toe gegaan.",
        "Die projek kos €2 500 000.",
        "Besoek https://example.com:8443/pad?taal=af vandag.",
        "Dit is ’n toets.",
        "Die kontrakteur het die werk voltooi.",
    ],
)
def test_high_value_negative_cases(text: str) -> None:
    response = LanguageEngine().check_text(CheckRequest(text=text))
    assert not response.issues


def test_long_sentence_threshold_is_conservative() -> None:
    short = " ".join(["Ons"] + ["werk"] * 39) + "."
    long = " ".join(["Ons"] + ["werk"] * 40) + "."
    engine = LanguageEngine()
    assert "AF_LONG_SENTENCE_001" not in {
        issue.rule_id for issue in engine.check_text(CheckRequest(text=short)).issues
    }
    assert "AF_LONG_SENTENCE_001" in {
        issue.rule_id for issue in engine.check_text(CheckRequest(text=long)).issues
    }


def test_every_rule_has_unique_id_examples_and_catalog_entry() -> None:
    assert len({rule.id for rule in RULES}) == len(RULES)
    assert all(rule.good_example and rule.bad_example and rule.description_af for rule in RULES)
    assert {item["id"] for item in rule_catalog()} == {rule.id for rule in RULES}
