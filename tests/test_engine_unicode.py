from __future__ import annotations

import unicodedata

import pytest

from services.language_engine import CheckRequest, DocumentMode, LanguageEngine
from services.language_engine.normalization import normalize_for_lookup
from services.language_engine.tokenizer import TokenKind, tokenize


def test_tokenizer_preserves_decomposed_words_and_offsets() -> None:
    text = "mo\u0302re ree\u0308n"
    tokens = [token for token in tokenize(text) if token.kind is TokenKind.WORD]
    assert [token.text for token in tokens] == ["mo\u0302re", "ree\u0308n"]
    assert all(text[token.start : token.end] == token.text for token in tokens)
    assert normalize_for_lookup(tokens[0].text) == "môre"
    assert normalize_for_lookup(tokens[1].text) == "reën"


def test_tokenizer_keeps_structured_values_out_of_word_stream() -> None:
    text = "Skryf aan naam@example.com by https://example.com vir €2 500 en 10 kg."
    tokens = tokenize(text)
    assert any(
        token.kind is TokenKind.EMAIL and token.text == "naam@example.com" for token in tokens
    )
    assert any(
        token.kind is TokenKind.URL and token.text.startswith("https://") for token in tokens
    )
    assert any(token.kind is TokenKind.NUMBER and "€2 500" in token.text for token in tokens)
    assert any(token.kind is TokenKind.NUMBER and token.text == "10 kg" for token in tokens)


def test_issue_offsets_are_exact_after_emoji_and_diacritics() -> None:
    text = "🙂 Môre is hiedie dokument duidelk."
    response = LanguageEngine().check_text(CheckRequest(text=text))
    assert {issue.original for issue in response.issues} >= {"hiedie", "duidelk"}
    for issue in response.issues:
        assert text[issue.offset_start : issue.offset_end] == issue.original


def test_issue_ids_are_stable_and_change_with_position() -> None:
    engine = LanguageEngine()
    first = engine.check_text(CheckRequest(text="Hiedie dokument is reg."))
    repeated = engine.check_text(CheckRequest(text="Hiedie dokument is reg."))
    shifted = engine.check_text(CheckRequest(text="Nou: Hiedie dokument is reg."))
    assert first.issues[0].id == repeated.issues[0].id
    shifted_spelling = next(issue for issue in shifted.issues if issue.rule_id == "AF_SPELL_001")
    assert shifted_spelling.id != first.issues[0].id


def test_unicode_normalization_does_not_mutate_response_text() -> None:
    text = "mo\u0302re is goed."
    response = LanguageEngine().check_text(CheckRequest(text=text))
    assert response.text == text
    assert unicodedata.normalize("NFC", response.text) != response.text


@pytest.mark.parametrize("text", ["Dit is ’n toets.", "Dit is 'n toets."])
def test_afrikaans_apostrophe_article_is_not_quote_spacing(text: str) -> None:
    response = LanguageEngine().check_text(CheckRequest(text=text))
    assert "AF_QUOTE_SPACE_001" not in {issue.rule_id for issue in response.issues}


def test_rule_disable_and_severity_override() -> None:
    engine = LanguageEngine()
    disabled = engine.check_text(
        CheckRequest(text="Dit dit is reg.", disabled_rules={"AF_REPEAT_WORD_001"})
    )
    assert "AF_REPEAT_WORD_001" not in {issue.rule_id for issue in disabled.issues}
    overridden = engine.check_text(
        CheckRequest(
            text="Dit dit is reg.",
            rule_severity={"AF_REPEAT_WORD_001": "info"},
        )
    )
    repeated = next(issue for issue in overridden.issues if issue.rule_id == "AF_REPEAT_WORD_001")
    assert repeated.severity.value == "info"


def test_formal_abbreviation_is_only_style_in_formal_mode() -> None:
    engine = LanguageEngine()
    general = engine.check_text(CheckRequest(text="Stuur asb die dokument aan my."))
    formal = engine.check_text(
        CheckRequest(text="Stuur asb die dokument aan my.", document_mode=DocumentMode.FORMAL)
    )
    assert not general.issues
    assert [issue.rule_id for issue in formal.issues] == ["AF_FORMALITY_001"]
