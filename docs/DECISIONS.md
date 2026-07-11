# Architecture decision record

## ADR-001 — deterministic core before AI

**Decision:** Core checking is a Python package that works without an external
provider. AI is an opt-in adapter used for rewriting or secondary review.

**Why:** It provides predictable privacy, cost, latency, testability, and
explainable rule provenance. It also prevents document prompt injection from
controlling the checker.

**Consequence:** Initial breadth is limited by the original seed lexicon and rules;
coverage claims must be based on evaluation evidence.

## ADR-002 — FastAPI plus React/Vite PWA

**Decision:** Use FastAPI/Pydantic/SQLAlchemy for the service and React/TypeScript/
Vite for the installable web client.

**Why:** The Python boundary suits deterministic NLP and evaluation, while Vite
keeps a thin client simple and reusable. A PWA supplies the first desktop install
path without Electron or premature native complexity.

## ADR-003 — SQLite locally, PostgreSQL in shared production

**Decision:** Default to SQLite through SQLAlchemy and document PostgreSQL for
multi-user deployment.

**Why:** Local setup remains one command and the repository layer avoids coupling
domain logic to a database.

## ADR-004 — original data until licensing is verified

**Decision:** Bundle only project-authored seed words, terminology, and evaluation
sentences. Provide adapters/setup notes for Hunspell, LanguageTool, HAT, and WAT.

**Why:** Redistributing an attractive but uncertain word list would undermine the
commercial-use and attribution requirements.

## ADR-005 — original-string offsets

**Decision:** Normalisation is used only for comparison; issue offsets always
refer to the untouched input, and clients verify the original span before edits.

**Why:** User text fidelity is more important than simplifying normalisation and
this makes correction application auditable.

## ADR-006 — conservative grammar rules

**Decision:** Register small rules with IDs, localised messages, severity,
configuration, examples, positive fixtures, and negative fixtures.

**Why:** Afrikaans grammar heuristics can easily over-flag. Rules that cannot be
tested conservatively remain research items.

## ADR-007 — no accounts in the first local release

**Decision:** Deliver guest/local preference and terminology persistence first.
Keep repository and API boundaries ready for authenticated ownership, but do not
ship a token account flow without complete session, CSRF, reset, deletion, and
multi-tenant isolation work.

**Consequence:** Optional user accounts are a documented post-release item, not a
feature claim. Local data export/delete remains required where implemented.

## ADR-008 — integration foundations are not distribution claims

**Decision:** Browser, Office, and iOS sources may be delivered as credible thin
clients, but are labelled foundation/beta until platform builds and privacy tests
run on their target hosts.

**Why:** This Windows environment cannot sign every client or compile Xcode code;
shipping source is useful, pretending it was device-tested is not.
