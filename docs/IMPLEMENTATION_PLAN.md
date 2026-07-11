# Implementation plan

## Delivery principles

- Complete vertical slices in dependency order and run the relevant test gates at
  each milestone.
- Keep deterministic checking useful without network or model credentials.
- Prefer conservative rules with negative fixtures over impressive-looking rules
  that generate false positives.
- Mark platform foundations separately from tested, distributable clients.

## Prioritised task list

### P0 — first-release blockers

1. Foundation: packaging, environment validation, shared contracts, database,
   scripts, CI, containers, and the required design/security documentation.
2. Deterministic core: Unicode-safe tokens and offsets, seed dictionary adapters,
   ranked suggestions, custom terms, registered rules, and evaluation reporting.
3. API: versioned check/rewrite/lookup/terminology routes, local persistence,
   privacy enforcement, request limits, CORS, rate limiting, and tests.
4. Web/PWA: responsive editor, issue workflows, correction history, comparison
   view, settings/privacy, word helper, terminology screens, accessibility tests,
   and production build.
5. Verification: full unit/integration/frontend suite, evaluation quality gates,
   lint/type checks, container configuration validation, and honest limitation docs.

### P1 — reusable integration foundations

6. Provider-agnostic AI gateway with mock tests, protected-span validation, cost
   limits, explicit cloud consent, and no-provider fallback.
7. Manifest V3 browser client with explicit checking, editable/secure-field guards,
   per-site controls, and Chrome/Edge packaging validation.
8. Word Office.js task pane with selection-bound correction and sideload guidance.
9. iOS Share Extension compile-oriented sources and explicit Xcode setup.

### P2 — post-release hardening

10. Verified open/licensed dictionary and morphology adapters, measured on a larger
    independent corpus.
11. Authenticated multi-user accounts, export/delete workflows, PostgreSQL
    migrations, distributed throttling, and production observability.
12. Signed extension/add-in releases, macOS/iOS compilation, device testing, and
    only then a privacy-reviewed custom keyboard beta.

## Milestones and exit gates

| Milestone | Deliverable | Exit gate |
| --- | --- | --- |
| 1 Foundation | Runnable monorepo and planning baseline | clean install paths; config validation; docs present |
| 2 Engine/API | Offline check, rewrite, lookup, custom terms | backend tests pass; offset and malformed-input tests pass; evaluation has zero crashes |
| 3 Web/PWA | Complete first-release user journey | unit tests, type check, lint, build, keyboard workflow pass |
| 4 AI boundary | Optional structured gateway | mock/provider error tests; local mode proves no call; factual spans preserved |
| 5 Browser | Safe explicit field checking | build/test fixtures prove excluded fields and sites stay untouched |
| 6 Office | Selected-text Word flow | manifest validates; browser-level mocks pass; real Office verification remains labelled |
| 7 iOS share | Swift foundation | source/static review; Xcode/device build tracked if unavailable here |
| 8 Keyboard | Local-first foundation | separate privacy review and real-device testing required before release |

## Release verification order

1. `python -m pytest`
2. `python -m ruff check .` and `python -m ruff format --check .`
3. `python -m services.language_engine.evaluation`
4. `npm run test --prefix apps/web`
5. `npm run typecheck --prefix apps/web`
6. `npm run lint --prefix apps/web`
7. `npm run build --prefix apps/web`
8. Integration client static/build tests available on this host
9. `docker compose config` and container builds when Docker is available

Failures are fixed or documented as environment blockers; no gate is disabled.
