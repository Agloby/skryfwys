"""Conservative, extensible Afrikaans grammar, punctuation, and style rules."""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from .issues import make_issue
from .lexicon import SeedLexicon
from .models import DocumentMode, Issue, IssueType, Severity, SuggestionSource
from .normalization import match_case, normalize_for_lookup
from .tokenizer import Token, TokenKind, sentence_ranges, tokenize


@dataclass(frozen=True, slots=True)
class RuleContext:
    text: str
    document_mode: DocumentMode
    lexicon: SeedLexicon
    tokens: tuple[Token, ...]


RuleCheck = Callable[[RuleContext], Iterable[Issue]]


@dataclass(frozen=True, slots=True)
class RuleDefinition:
    id: str
    title_af: str
    description_af: str
    good_example: str
    bad_example: str
    default_severity: Severity
    check: RuleCheck


def _word_tokens(context: RuleContext) -> list[Token]:
    return [token for token in context.tokens if token.kind is TokenKind.WORD]


def _overlaps_structured_token(context: RuleContext, start: int, end: int) -> bool:
    return any(
        token.kind in {TokenKind.URL, TokenKind.EMAIL, TokenKind.NUMBER}
        and start < token.end
        and end > token.start
        for token in context.tokens
    )


def repeated_words(context: RuleContext) -> Iterable[Issue]:
    words = _word_tokens(context)
    for left, right in zip(words, words[1:], strict=False):
        if normalize_for_lookup(left.text) != normalize_for_lookup(right.text):
            continue
        between = context.text[left.end : right.start]
        if between.isspace():
            yield make_issue(
                context.text,
                rule_id="AF_REPEAT_WORD_001",
                issue_type=IssueType.GRAMMAR,
                severity=Severity.ERROR,
                message_af="Hierdie woord kom onnodig twee keer na mekaar voor.",
                message_en="This word is repeated unnecessarily.",
                start=left.start,
                end=right.end,
                confidence=0.99,
                replacements=[(left.text, 0.99, SuggestionSource.RULE)],
            )


def repeated_punctuation(context: RuleContext) -> Iterable[Issue]:
    for match in re.finditer(r"([!?;,])\1+|\.{4,}", context.text):
        replacement = "..." if match.group().startswith(".") else match.group()[0]
        yield make_issue(
            context.text,
            rule_id="AF_REPEAT_PUNCT_001",
            issue_type=IssueType.PUNCTUATION,
            severity=Severity.WARNING,
            message_af="Gebruik net soveel leestekens as wat hier nodig is.",
            message_en="Repeated punctuation can make the sentence harder to read.",
            start=match.start(),
            end=match.end(),
            confidence=0.98,
            replacements=[(replacement, 0.98, SuggestionSource.RULE)],
        )


def space_before_punctuation(context: RuleContext) -> Iterable[Issue]:
    for match in re.finditer(r"[ \t]+([,;:!?])", context.text):
        if _overlaps_structured_token(context, match.start(), match.end()):
            continue
        yield make_issue(
            context.text,
            rule_id="AF_SPACE_BEFORE_PUNCT_001",
            issue_type=IssueType.PUNCTUATION,
            severity=Severity.ERROR,
            message_af="Laat nie 'n spasie voor hierdie leesteken nie.",
            message_en="Remove the space before this punctuation mark.",
            start=match.start(),
            end=match.end(),
            confidence=0.99,
            replacements=[(match.group(1), 0.99, SuggestionSource.RULE)],
        )


def space_after_punctuation(context: RuleContext) -> Iterable[Issue]:
    for match in re.finditer(r"([,;:!?])(?=[^\W\d_])", context.text):
        # End-of-text punctuation needs no trailing space.
        if match.end() == len(context.text) or _overlaps_structured_token(
            context, match.start(), match.end()
        ):
            continue
        yield make_issue(
            context.text,
            rule_id="AF_SPACE_AFTER_PUNCT_001",
            issue_type=IssueType.PUNCTUATION,
            severity=Severity.WARNING,
            message_af="Voeg 'n spasie ná hierdie leesteken in.",
            message_en="Add a space after this punctuation mark.",
            start=match.start(),
            end=match.end(),
            confidence=0.97,
            replacements=[(match.group(1) + " ", 0.97, SuggestionSource.RULE)],
        )


def quotation_spacing(context: RuleContext) -> Iterable[Issue]:
    for match in re.finditer(r"([\"“‘])\s+", context.text):
        yield make_issue(
            context.text,
            rule_id="AF_QUOTE_SPACE_001",
            issue_type=IssueType.PUNCTUATION,
            severity=Severity.WARNING,
            message_af="Verwyder die spasie direk ná die openingsaanhalingsteken.",
            message_en="Remove the space after the opening quotation mark.",
            start=match.start(),
            end=match.end(),
            confidence=0.96,
            replacements=[(match.group(1), 0.96, SuggestionSource.RULE)],
        )
    for match in re.finditer(r"\s+([\"”’])(?!\w)", context.text):
        yield make_issue(
            context.text,
            rule_id="AF_QUOTE_SPACE_001",
            issue_type=IssueType.PUNCTUATION,
            severity=Severity.WARNING,
            message_af="Verwyder die spasie direk voor die sluitingsaanhalingsteken.",
            message_en="Remove the space before the closing quotation mark.",
            start=match.start(),
            end=match.end(),
            confidence=0.96,
            replacements=[(match.group(1), 0.96, SuggestionSource.RULE)],
        )


def sentence_capitalization(context: RuleContext) -> Iterable[Issue]:
    for range_start, range_end in sentence_ranges(context.text):
        segment = context.text[range_start:range_end]
        match = re.search(r"(?:^|\s)[\"'“‘(\[]*([^\W\d_][\u0300-\u036f]*)", segment)
        if not match:
            continue
        first = match.group(1)
        if not first.islower():
            continue
        start = range_start + match.start(1)
        yield make_issue(
            context.text,
            rule_id="AF_SENTENCE_CAP_001",
            issue_type=IssueType.GRAMMAR,
            severity=Severity.WARNING,
            message_af="Begin die sin met 'n hoofletter.",
            message_en="Start the sentence with a capital letter.",
            start=start,
            end=start + len(first),
            confidence=0.98,
            replacements=[(first.upper(), 0.98, SuggestionSource.RULE)],
        )


def negative_construction(context: RuleContext) -> Iterable[Issue]:
    for start, end in sentence_ranges(context.text):
        sentence = context.text[start:end]
        words = [
            normalize_for_lookup(token.text)
            for token in tokenize(sentence)
            if token.kind is TokenKind.WORD
        ]
        if words.count("nie") != 1 or len(words) < 5:
            continue
        first_nie = words.index("nie")
        if first_nie >= len(words) - 1:
            continue
        if not any(
            modal in words[:first_nie]
            for modal in ("sal", "kan", "wil", "moet", "het", "is", "was")
        ):
            continue
        stripped_end = end
        while stripped_end > start and context.text[stripped_end - 1] in ".!? \t\r\n":
            stripped_end -= 1
        replacement = context.text[start:stripped_end] + " nie" + context.text[stripped_end:end]
        yield make_issue(
            context.text,
            rule_id="AF_NEGATION_001",
            issue_type=IssueType.GRAMMAR,
            severity=Severity.WARNING,
            message_af="Hier ontbreek waarskynlik die tweede ‘nie’ van die Afrikaanse ontkenning.",
            message_en="The second 'nie' in the Afrikaans negative construction may be missing.",
            start=start,
            end=end,
            confidence=0.86,
            replacements=[(replacement, 0.86, SuggestionSource.RULE)],
        )


def word_order(context: RuleContext) -> Iterable[Issue]:
    pattern = re.compile(r"\b(sal|kan|wil|moet)\s+nie\s+(dit|hom|haar|hulle)\b", re.IGNORECASE)
    for match in pattern.finditer(context.text):
        modal, object_word = match.group(1), match.group(2)
        replacement = f"{modal} {object_word} nie"
        yield make_issue(
            context.text,
            rule_id="AF_WORD_ORDER_001",
            issue_type=IssueType.GRAMMAR,
            severity=Severity.WARNING,
            message_af="Die voorwerp staan gewoonlik voor ‘nie’ in hierdie sinsbou.",
            message_en="The object usually precedes 'nie' in this construction.",
            start=match.start(),
            end=match.end(),
            confidence=0.9,
            replacements=[(match_case(replacement, match.group()), 0.9, SuggestionSource.RULE)],
        )


def past_tense(context: RuleContext) -> Iterable[Issue]:
    replacements = {
        "gaan": "gegaan",
        "loop": "geloop",
        "doen": "gedoen",
        "sien": "gesien",
        "skryf": "geskryf",
    }
    pattern = re.compile(
        r"\bhet\b(?:(?![.!?]).){0,80}?\b(" + "|".join(replacements) + r")\b", re.IGNORECASE
    )
    for match in pattern.finditer(context.text):
        before_verb = match.group()[: match.start(1) - match.start()]
        if re.search(r"\bom\b(?:(?![.!?]).){0,40}\bte\s+$", before_verb, re.IGNORECASE):
            # Here "het" is possession and the target is an infinitive, e.g.
            # "Ek het 'n plan om môre te gaan."
            continue
        verb_start, verb_end = match.span(1)
        verb = match.group(1)
        replacement = match_case(replacements[normalize_for_lookup(verb)], verb)
        yield make_issue(
            context.text,
            rule_id="AF_PAST_TENSE_001",
            issue_type=IssueType.GRAMMAR,
            severity=Severity.WARNING,
            message_af="Ná ‘het’ is die voltooide vorm van hierdie werkwoord waarskynlik nodig.",
            message_en="After 'het', this verb probably needs its past participle form.",
            start=verb_start,
            end=verb_end,
            confidence=0.91,
            replacements=[(replacement, 0.91, SuggestionSource.RULE)],
        )


def split_compounds(context: RuleContext) -> Iterable[Issue]:
    for separated, joined in context.lexicon.split_compounds.items():
        if separated == joined:
            continue
        pattern = re.compile(
            r"\b" + r"\s+".join(map(re.escape, separated.split())) + r"\b", re.IGNORECASE
        )
        for match in pattern.finditer(context.text):
            yield make_issue(
                context.text,
                rule_id="AF_COMPOUND_SPLIT_001",
                issue_type=IssueType.SPELLING,
                severity=Severity.ERROR,
                message_af="Hierdie samestelling word waarskynlik as een woord geskryf.",
                message_en="This compound is probably written as one word.",
                start=match.start(),
                end=match.end(),
                confidence=0.97,
                replacements=[
                    (match_case(joined, match.group()), 0.97, SuggestionSource.DICTIONARY)
                ],
            )


def formal_wording(context: RuleContext) -> Iterable[Issue]:
    if context.document_mode not in {
        DocumentMode.FORMAL,
        DocumentMode.ACADEMIC,
        DocumentMode.PROFESSIONAL,
    }:
        return
    for token in _word_tokens(context):
        key = normalize_for_lookup(token.text)
        replacement = context.lexicon.formal_replacements.get(key)
        if not replacement:
            continue
        yield make_issue(
            context.text,
            rule_id="AF_FORMALITY_001",
            issue_type=IssueType.STYLE,
            severity=Severity.INFO,
            message_af="Oorweeg 'n formeler alternatief in hierdie dokumentmodus.",
            message_en="Consider a more formal alternative in this document mode.",
            start=token.start,
            end=token.end,
            confidence=0.9,
            replacements=[(match_case(replacement, token.text), 0.9, SuggestionSource.RULE)],
        )


def english_mixing(context: RuleContext) -> Iterable[Issue]:
    for start, end in sentence_ranges(context.text):
        sentence_tokens = [
            token
            for token in context.tokens
            if token.kind is TokenKind.WORD and start <= token.start < end
        ]
        english = [
            token
            for token in sentence_tokens
            if normalize_for_lookup(token.text) in context.lexicon.english_words
        ]
        if len(english) < 2 or len(english) / max(len(sentence_tokens), 1) < 0.2:
            continue
        first, last = english[0], english[-1]
        yield make_issue(
            context.text,
            rule_id="AF_ENGLISH_MIX_001",
            issue_type=IssueType.STYLE,
            severity=Severity.INFO,
            message_af="Hierdie sin meng heelwat Engelse woorde met Afrikaans. Kontroleer of dit by die lesers pas.",
            message_en="This sentence mixes several English words into Afrikaans; check whether that suits the audience.",
            start=first.start,
            end=last.end,
            confidence=0.78,
        )


def long_sentence(context: RuleContext) -> Iterable[Issue]:
    for start, end in sentence_ranges(context.text):
        count = sum(
            1
            for token in context.tokens
            if token.kind is TokenKind.WORD and start <= token.start < end
        )
        if count <= 40:
            continue
        yield make_issue(
            context.text,
            rule_id="AF_LONG_SENTENCE_001",
            issue_type=IssueType.CLARITY,
            severity=Severity.INFO,
            message_af=f"Hierdie sin het {count} woorde. Oorweeg twee korter sinne.",
            message_en=f"This sentence has {count} words; consider splitting it.",
            start=start,
            end=end,
            confidence=0.88,
        )


def passive_voice(context: RuleContext) -> Iterable[Issue]:
    pattern = re.compile(r"\b(?:word|is|was)\b(?:(?![.!?]).){0,80}?\bdeur\b", re.IGNORECASE)
    for match in pattern.finditer(context.text):
        if context.document_mode is DocumentMode.INFORMAL:
            continue
        yield make_issue(
            context.text,
            rule_id="AF_PASSIVE_001",
            issue_type=IssueType.STYLE,
            severity=Severity.INFO,
            message_af="Hierdie sinsdeel gebruik moontlik die lydende vorm. Die bedrywende vorm kan duideliker wees.",
            message_en="This may be passive voice; active voice can be clearer.",
            start=match.start(),
            end=match.end(),
            confidence=0.76,
        )


def number_format(context: RuleContext) -> Iterable[Issue]:
    for match in re.finditer(r"(?<!\w)([R€$£]?\s?\d{1,3}(?:,\d{3}){1,})(?!\d)", context.text):
        replacement = match.group().replace(",", " ")
        yield make_issue(
            context.text,
            rule_id="AF_NUMBER_FORMAT_001",
            issue_type=IssueType.STYLE,
            severity=Severity.INFO,
            message_af="Afrikaanse teks gebruik gewoonlik spasies om groepe van drie syfers te skei.",
            message_en="Afrikaans text normally uses spaces to group thousands.",
            start=match.start(),
            end=match.end(),
            confidence=0.94,
            replacements=[(replacement, 0.94, SuggestionSource.RULE)],
        )


def measurement_spacing(context: RuleContext) -> Iterable[Issue]:
    pattern = re.compile(
        r"(?<!\w)(\d+(?:[,.]\d+)?)(mm|cm|km|kg|mg|ml|m²|m³|ha)(?!\w)", re.IGNORECASE
    )
    for match in pattern.finditer(context.text):
        yield make_issue(
            context.text,
            rule_id="AF_MEASUREMENT_SPACE_001",
            issue_type=IssueType.PUNCTUATION,
            severity=Severity.WARNING,
            message_af="Plaas 'n spasie tussen die getal en die maateenheidsimbool.",
            message_en="Insert a space between the number and unit symbol.",
            start=match.start(),
            end=match.end(),
            confidence=0.97,
            replacements=[(f"{match.group(1)} {match.group(2)}", 0.97, SuggestionSource.RULE)],
        )


RULES: tuple[RuleDefinition, ...] = (
    RuleDefinition(
        "AF_REPEAT_WORD_001",
        "Herhaalde woord",
        "Spoor opeenvolgende duplikate op.",
        "Dit is reg.",
        "Dit dit is reg.",
        Severity.ERROR,
        repeated_words,
    ),
    RuleDefinition(
        "AF_REPEAT_PUNCT_001",
        "Herhaalde leestekens",
        "Beperk oormatige leestekens.",
        "Reg!",
        "Reg!!!",
        Severity.WARNING,
        repeated_punctuation,
    ),
    RuleDefinition(
        "AF_SPACE_BEFORE_PUNCT_001",
        "Spasie voor leesteken",
        "Verwyder spasies voor leestekens.",
        "Ja, beslis.",
        "Ja , beslis.",
        Severity.ERROR,
        space_before_punctuation,
    ),
    RuleDefinition(
        "AF_SPACE_AFTER_PUNCT_001",
        "Spasie ná leesteken",
        "Voeg spasies ná leestekens in.",
        "Ja, beslis.",
        "Ja,beslis.",
        Severity.WARNING,
        space_after_punctuation,
    ),
    RuleDefinition(
        "AF_QUOTE_SPACE_001",
        "Aanhalingspasies",
        "Kontroleer spasies binne aanhalingstekens.",
        "“woord”",
        "“ woord ”",
        Severity.WARNING,
        quotation_spacing,
    ),
    RuleDefinition(
        "AF_SENTENCE_CAP_001",
        "Hoofletter",
        "Vereis 'n hoofletter aan die begin van 'n sin.",
        "Die werk begin.",
        "die werk begin.",
        Severity.WARNING,
        sentence_capitalization,
    ),
    RuleDefinition(
        "AF_NEGATION_001",
        "Dubbele ontkenning",
        "Soek 'n ontbrekende tweede nie.",
        "Ons sal dit nie doen nie.",
        "Ons sal dit nie doen.",
        Severity.WARNING,
        negative_construction,
    ),
    RuleDefinition(
        "AF_WORD_ORDER_001",
        "Woordorde",
        "Kontroleer 'n hoë-sekerheid ontkenningspatroon.",
        "Ons sal dit nie doen nie.",
        "Ons sal nie dit doen nie.",
        Severity.WARNING,
        word_order,
    ),
    RuleDefinition(
        "AF_PAST_TENSE_001",
        "Verlede tyd",
        "Kontroleer sekere werkwoorde ná het.",
        "Ek het gegaan.",
        "Ek het gaan.",
        Severity.WARNING,
        past_tense,
    ),
    RuleDefinition(
        "AF_COMPOUND_SPLIT_001",
        "Samestelling",
        "Vind bekende gesplete samestellings.",
        "kosteberaming",
        "koste beraming",
        Severity.ERROR,
        split_compounds,
    ),
    RuleDefinition(
        "AF_FORMALITY_001",
        "Formaliteit",
        "Merk informele vorme in formele modusse.",
        "asseblief",
        "asb",
        Severity.INFO,
        formal_wording,
    ),
    RuleDefinition(
        "AF_ENGLISH_MIX_001",
        "Taalmenging",
        "Merk slegs sterk Engelse vermenging.",
        "Stuur die verslag.",
        "Please email die report.",
        Severity.INFO,
        english_mixing,
    ),
    RuleDefinition(
        "AF_LONG_SENTENCE_001",
        "Lang sin",
        "Merk sinne langer as veertig woorde.",
        "Hou sinne leesbaar.",
        "'n Baie lang sin ...",
        Severity.INFO,
        long_sentence,
    ),
    RuleDefinition(
        "AF_PASSIVE_001",
        "Lydende vorm",
        "Wys op waarskynlike passiewe konstruksies.",
        "Die span voltooi die werk.",
        "Die werk word deur die span voltooi.",
        Severity.INFO,
        passive_voice,
    ),
    RuleDefinition(
        "AF_NUMBER_FORMAT_001",
        "Getalformaat",
        "Gebruik spasies vir duisendgroepe.",
        "€2 500 000",
        "€2,500,000",
        Severity.INFO,
        number_format,
    ),
    RuleDefinition(
        "AF_MEASUREMENT_SPACE_001",
        "Maatspasie",
        "Skei getalle en eenhede.",
        "10 kg",
        "10kg",
        Severity.WARNING,
        measurement_spacing,
    ),
)


def run_rules(
    text: str,
    *,
    lexicon: SeedLexicon,
    document_mode: DocumentMode,
    disabled_rules: set[str] | None = None,
    rule_severity: dict[str, Severity] | None = None,
) -> list[Issue]:
    """Execute enabled rule definitions in a deterministic order."""

    disabled = disabled_rules or set()
    severity_overrides = rule_severity or {}
    context = RuleContext(text, document_mode, lexicon, tuple(tokenize(text)))
    issues: list[Issue] = []
    for rule in RULES:
        if rule.id not in disabled:
            produced = list(rule.check(context))
            if rule.id in severity_overrides:
                produced = [
                    issue.model_copy(update={"severity": severity_overrides[rule.id]})
                    for issue in produced
                ]
            issues.extend(produced)
    return issues


def rule_catalog() -> list[dict[str, str]]:
    return [
        {
            "id": rule.id,
            "title_af": rule.title_af,
            "description_af": rule.description_af,
            "good_example": rule.good_example,
            "bad_example": rule.bad_example,
            "default_severity": rule.default_severity.value,
        }
        for rule in RULES
    ]
