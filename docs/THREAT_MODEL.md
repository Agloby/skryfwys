# Threat model

## Scope and assets

In scope are the API, deterministic engine, optional model gateway, local database,
web/PWA, browser/Office/iOS integration foundations, containers, and build pipeline.
Assets include submitted text, personal/company terminology, provider credentials,
privacy consent, account data in future releases, and the integrity of corrections.

## Trust boundaries

1. User/browser to the Skryfwys API.
2. API to local/PostgreSQL persistence.
3. API/model gateway to a third-party or local model endpoint.
4. Web content page to an extension content script and extension storage.
5. Word document to an Office task pane.
6. iOS host app/secure field to a Share or keyboard extension.
7. Source repository to package registries, CI runners, and container images.

Document content crossing any boundary is untrusted even when written by the user.

## Threats and mitigations

| Threat | Example impact | Mitigation / verification |
| --- | --- | --- |
| Raw-text disclosure in logs | Confidential contract appears in telemetry | metadata-only logging; log-capture regression tests |
| Silent cloud processing | Private text leaves self-hosted boundary | two-condition provider gate (consent + config); local-mode mock asserts zero calls |
| Prompt injection | Document asks model to expose secrets/change policy | content delimiter, fixed policy, structured schema, output validation, injection fixtures |
| Destructive correction | Wrong span changes a name or amount | exact-original guard, protected spans, right-to-left edits, explicit acceptance, undo |
| Cross-user term access | One tenant sees company vocabulary | authenticated owner scope before accounts are released; isolated persistence tests |
| Resource exhaustion | Huge Unicode body or retry loop blocks service | body/field limits, rate limit, timeout, bounded retry/output, reverse-proxy limit |
| Stored/reflected XSS | Crafted text executes in issue/diff view | React escaping, no raw HTML, CSP, encoding tests |
| CSRF/session theft | Attacker changes private dictionary | no cookie accounts in first release; secure cookie + CSRF design required later |
| Extension overreach | Password/payment text is captured | field/autocomplete exclusions, explicit action, per-site disable, unit fixtures |
| Office range confusion | Correction replaces unrelated document text | selection-scoped range, original validation where feasible, Word undo |
| Keyboard surveillance | Keystrokes retained/transmitted | no storage, secure-field OS behavior, explicit command, local-first defaults |
| Supply-chain compromise | Malicious dependency or secret in repository | lockfiles, audits, secret scan, minimal pinned container bases, review updates |
| Unlicensed data | Copyright or commercial-use violation | licence register and adapter-only policy for uncertain resources |
| Diagnostic enumeration | Public docs reveal configuration | minimal health response; restrict detailed diagnostics/docs in production |

## Abuse cases deliberately not solved by AI

Skryfwys does not use a model to decide whether a correction is safe. A high
confidence number is not proof that legal, medical, contractual, or factual text
may be changed automatically. The user remains the decision maker and AI-origin
suggestions retain explicit provenance.

## Residual risk

The seed lexicon and heuristic rules can miss errors or make unsuitable suggestions.
An operator can misconfigure CORS, TLS, an OpenAI-compatible provider, or retention.
In-process throttling is not a distributed denial-of-service defence. Target-client
foundations have not necessarily been signed or device-tested on this Windows host.
These are release notes and roadmap items, not hidden assumptions.

Review this model whenever a provider, authenticated account flow, dataset, client
permission, history storage, or deployment topology is added.
