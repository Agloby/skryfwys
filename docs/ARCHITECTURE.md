# Architecture

## Context

Skryfwys is a modular monorepo with one deterministic domain core and several
thin clients. Clients never implement their own language rules. External language
resources and model providers sit behind adapters so licensing or vendor changes
do not alter the engine contract.

```text
Web/PWA   Browser extension   Word add-in   iOS clients
    \            |                |             /
                  Versioned FastAPI
                         |
       request limits + privacy policy + persistence
                         |
               deterministic language engine
             /              |                 \
     dictionary adapters  rule registry   optional model gateway
             \              |                 /
             original seed data + user terminology
```

## Repository boundaries

- `services/language_engine`: provider-neutral domain models, Unicode-aware
  normalization/tokenization, dictionary adapters, candidate ranking, registered
  rules, rewrites, redaction/protected spans, and evaluation.
- `services/api`: FastAPI transport, validation, rate limiting, CORS, privacy-mode
  enforcement, database sessions/repositories, diagnostics, and HTTP error mapping.
- `apps/web`: React state, accessible presentation, local edit history, issue
  application, diff display, settings, and the installable PWA shell.
- `apps/browser-extension`, `apps/office-addin`, `apps/ios`: thin integration
  clients that use the same API and add platform-specific safety checks.
- `packages/shared-types`: TypeScript mirrors of externally visible contracts.
- `data`: only original or licence-verified lexicons, terminology, rules, and
  evaluation fixtures. Every external source must appear in the licence register.

Import direction is inward: API and clients may depend on contracts and the API
may depend on the engine; the engine may not depend on FastAPI, SQLAlchemy, React,
or a particular AI vendor.

## Checking pipeline

1. Validate request length, locale, document mode, enabled rules, and privacy mode.
2. Preserve the original text and build a normalised comparison representation.
3. Identify protected spans (URLs, email addresses, money, numbers, quoted text,
   abbreviations) and tokenise without changing original offsets.
4. Classify tokens using seed, terminology, personal, ignored, and adapter-backed
   lexicons.
5. Generate spelling candidates and rank deterministic signals: edit distance,
   diacritics, keyboard proximity, case, frequency hints, compounds, and custom
   terminology.
6. Run enabled registered grammar/style/terminology rules.
7. Optionally invoke an AI review only when policy and configuration both permit it.
8. Validate, merge, de-duplicate, and deterministically sort issues.
9. Verify each returned span against the untouched input and calculate summary
   metrics without persisting the text.

## Offset contract

Offsets are half-open indexes into the exact request string (`text[start:end]`).
The HTTP contract follows Python/JavaScript Unicode code-point semantics for the
characters covered by Afrikaans; clients must use the returned `original` value as
an additional guard before applying a change. Corrections are applied from the end
of the document toward the beginning to prevent offset drift. Overlapping bulk
changes are rejected.

## Persistence

SQLite is the local default. SQLAlchemy keeps repositories compatible with
PostgreSQL for production. Only user preferences, personal terms, ignored rules,
terminology collections, consent state, and opt-in history may be stored. The
default diagnostic record contains request ID, timestamps, duration, counts,
status, and provider/cost metadata—not submitted text.

## Model gateway

The model gateway defines a structured rewrite/review interface with mock,
OpenAI-compatible, and local Ollama-compatible adapters. Provider configuration is
environment driven. The gateway uses bounded timeouts/retries, treats document
content as quoted untrusted data, validates structured output, protects factual
spans, and falls back without preventing deterministic checks.

## Deployment

Local development uses Uvicorn, Vite, and SQLite. Containers run as non-root users
with health checks. Shared or multi-user deployments terminate TLS at a reverse
proxy, use PostgreSQL, set an explicit CORS allowlist, and place durable database
backups outside the application container.
