# Test strategy

## Risk-based approach

The highest risks are incorrect offsets, destructive corrections, privacy-mode
leakage, excessive false positives, malformed AI output, persistence isolation,
and inaccessible correction workflows. Tests therefore assert invariants rather
than only snapshots or HTTP status codes.

## Backend unit tests

- Unicode tokenisation and exact half-open spans, including `môre`, `reën`, curly
  quotes, apostrophes, hyphens, emoji, CRLF, and decomposed combining characters.
- Normalisation that never mutates the returned original text.
- Case/diacritic awareness, transpositions, missing spaces, split compounds,
  terminology, names, abbreviations, numbers, measurements, URLs, and email spans.
- Candidate ordering, deterministic tie-breaking, confidence bounds, and safe
  replacement thresholds.
- Each registered rule has positive, negative, disabled-rule, severity, and
  stable-ID tests.
- Protected-span rewrite/redaction and no-provider/model-error fallback.

## API and persistence integration tests

- Versioned check, rewrite, lookup, term CRUD/import/export, settings,
  diagnostics, health, and OpenAPI contracts.
- A personal term changes a subsequent check and persists in an isolated temporary
  database.
- Invalid enum values, broken JSON, unsupported media types, oversized bodies,
  rate limits, hostile Unicode, and prompt-injection-shaped document text.
- CORS allowlists, security headers, privacy-mode/provider enforcement, and the
  absence of raw document text in captured logs.
- Concurrent requests and deterministic result ordering.

## Web tests

- Editor state, issue grouping, original-span guard, individual and safe bulk
  application, overlapping issue handling, ignore/add-term, undo, and redo.
- Rewrite mode selection, comparison/diff, protected content, error/retry states,
  API-offline state, and privacy consent transitions.
- Keyboard navigation, focus restoration, accessible names/live regions,
  non-colour issue cues, reduced motion, narrow viewport layout, and 200% zoom.
- TypeScript strict checking, linting, Vitest, and a production build are required.
  Playwright smoke coverage is added when browser binaries are available.

## Evaluation data

All bundled examples are original project-authored text and carry explicit labels.
The target inventory is at least 100 accepted sentences, 100 spelling errors, 100
grammar/punctuation errors, 50 compounds, 50 code-switching cases, 50 formality
cases, and 25 construction/quantity-surveying cases. Generated padding must still
be meaningful, individually labelled text rather than duplicate metric inflation.

The evaluation command emits JSON plus Markdown with spelling precision/recall,
top-1/top-3 accuracy, grammar precision/recall where labels allow, false positives
per 1,000 words, crashes, offsets, and latency percentiles. AI cost is `not
applicable` unless an external provider was deliberately evaluated.

## Release gates

- zero crashes and zero invalid issue offsets on every evaluation record;
- zero critical/security test failures;
- deterministic paragraph check below 500 ms on the recorded development host;
- all repository tests, lint, types, and builds pass;
- observed false-positive rates and limited data coverage are published without a
  Grammarly-level accuracy claim.

Platform builds not possible on this host are recorded as unverified, with exact
commands for the next compatible environment.
