# Known limitations

## Language quality

- The original Skryfwys lexicon is a functional seed, not an authoritative
  comprehensive Afrikaans dictionary. A replaceable LibreOffice Afrikaans
  Hunspell wordlist now reduces false spelling alerts for valid base-form words,
  but full affix expansion is not implemented yet. Correct inflected forms can
  still be missed, and many misspellings outside the candidate neighbourhood can
  be missed.
- Grammar analysis is a conservative registered rule set, not a parser. Nuanced
  agreement, idiom, word order, double negatives, and compound formation often
  require human judgement.
- Seed frequencies and morphological heuristics are too small to claim commercial
  assistant accuracy. A small Leipzig Afrikaans Wikipedia frequency table now
  helps rank suggestions, but it is corpus-derived and filtered for ranking only;
  it is not an authority on correctness. The evaluation suite is project-authored
  and useful for regression, but is not an independent representative corpus.
- Word help cannot provide an authoritative definition unless a future authorised
  lexical adapter supplies one. Generated guidance, if enabled, must be labelled.

## Product scope

- The first release is local guest mode. Complete account registration, secure
  recovery/session management, multi-tenant isolation, and account-wide export/
  deletion remain post-release work.
- Deterministic rewrites are deliberately modest. An optional external model can
  improve fluency but adds provider privacy/cost risk and can still make unsuitable
  factual or tonal changes.
- Document formatting beyond plain text is not preserved by the web editor.
- In-process rate limiting protects a single instance only; scaled deployments
  need a shared store or gateway control.

## Integrations

- Browser, Word, and iOS directories contain integration foundations rather than
  signed store releases. Real-site compatibility, Office host versions, extension
  review, Apple signing, and device accessibility/privacy testing remain required.
- iOS does not give third-party keyboards unrestricted context or access in secure
  fields. The keyboard cannot promise system-wide checking, and full access must
  never be treated as implicit cloud consent.
- A Windows PWA is the desktop route; no Tauri/Electron wrapper is included because
  no required native capability justified that maintenance and attack surface.

## Verification environment

The recorded development host is Windows with Python 3.14 and Node.js 24. Docker
Desktop 29.6.1 and Docker Compose v5.2.0 were available for the 2026-07-12
container smoke test. GNU Make, Xcode, iOS simulators, and a live Microsoft Word
sideload host are not available unless a later report says otherwise. Their
sources/configuration can be validated statically here, but production claims
require target-platform runs.

No HAT or WAT content is bundled. External language resources remain adapters
unless their exact licences and commercial redistribution rights are documented.
