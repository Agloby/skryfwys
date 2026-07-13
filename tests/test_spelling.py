from __future__ import annotations

import pytest

from services.language_engine import (
    CheckRequest,
    LanguageEngine,
    SuggestWordRequest,
)
from services.language_engine.lexicon import load_seed_lexicon
from services.language_engine.models import LookupRequest
from services.language_engine.spelling import damerau_levenshtein


def test_every_misspelling_mapping_has_distinct_accepted_target() -> None:
    lexicon = load_seed_lexicon()
    for source, target in lexicon.misspellings.items():
        assert source != target
        assert lexicon.contains(target)


def test_verified_hunspell_provider_broadens_known_correct_words() -> None:
    lexicon = load_seed_lexicon()

    assert any("LibreOffice Afrikaans Hunspell" in provider.source_name for provider in lexicon.providers)
    assert lexicon.contains("grondwetlik")
    assert "grondwetlik" not in lexicon.words()


def test_lookup_reports_hunspell_source_without_inventing_meaning() -> None:
    response = LanguageEngine().lookup_word(LookupRequest(word="grondwetlik"))

    assert response.spelling_status == "correct"
    assert response.meaning is None
    assert any("LibreOffice Afrikaans Hunspell" in source for source in response.sources)


@pytest.mark.parametrize(
    ("text", "original", "suggestion"),
    [
        ("Hiedie dokument is gereed.", "Hiedie", "Hierdie"),
        ("Die teks is duidelk.", "duidelk", "duidelik"),
        ("Ons het die projeck voltooi.", "projeck", "projek"),
        ("Ek skyrf die woord.", "skyrf", "skryf"),
        ("Dit gebeur onmiddelik.", "onmiddelik", "onmiddellik"),
    ],
)
def test_known_errors_have_ranked_top_suggestion(text: str, original: str, suggestion: str) -> None:
    response = LanguageEngine().check_text(CheckRequest(text=text))
    issue = next(item for item in response.issues if item.original == original)
    assert issue.rule_id == "AF_SPELL_001"
    assert issue.suggestions[0].text == suggestion
    assert issue.suggestions[0].confidence >= 0.9


def test_case_is_carried_to_suggestion() -> None:
    response = LanguageEngine().check_text(CheckRequest(text="HIEDIE dokument is reg."))
    issue = next(item for item in response.issues if item.rule_id == "AF_SPELL_001")
    assert issue.suggestions[0].text == "HIERDIE"


def test_diacritic_aware_suggestion() -> None:
    response = LanguageEngine().suggest_word(SuggestWordRequest(word="reel"))
    assert response.correct is False
    assert any(suggestion.text == "reël" for suggestion in response.suggestions[:3])


def test_custom_term_and_ignore_word_override_seed_error() -> None:
    engine = LanguageEngine()
    custom = engine.check_text(CheckRequest(text="duidelk", custom_terms={"duidelk"}))
    ignored = engine.check_text(CheckRequest(text="duidelk", ignore_words={"duidelk"}))
    assert "AF_SPELL_001" not in {issue.rule_id for issue in custom.issues}
    assert "AF_SPELL_001" not in {issue.rule_id for issue in ignored.issues}


def test_unknown_name_and_abbreviation_are_conservatively_accepted() -> None:
    response = LanguageEngine().check_text(CheckRequest(text="Armand stuur die PDF vandag."))
    assert "AF_SPELL_001" not in {issue.rule_id for issue in response.issues}


def test_hyphenated_known_words_are_accepted() -> None:
    response = LanguageEngine().check_text(CheckRequest(text="Die Suid-Afrika-projek is gereed."))
    assert "AF_SPELL_001" not in {issue.rule_id for issue in response.issues}


def test_damerau_distance_recognizes_transposition() -> None:
    assert damerau_levenshtein("skyrf", "skryf") == 1
    assert damerau_levenshtein("antwoord", "antwoord") == 0


def test_suggest_word_marks_seed_and_custom_terms_correct() -> None:
    engine = LanguageEngine()
    assert engine.suggest_word(SuggestWordRequest(word="dokument")).correct
    assert engine.suggest_word(
        SuggestWordRequest(word="Skryfwys", custom_terms={"Skryfwys"})
    ).correct
