# API

## Endpoints

- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/diagnostics`
- `GET /api/v1/rules`
- `POST /api/v1/check`
- `POST /api/v1/suggest`
- `POST /api/v1/rewrite`
- `POST /api/v1/lookup`
- `POST /api/v1/custom-terms`
- `GET /api/v1/custom-terms`
- `POST /api/v1/custom-terms/import`
- `POST /api/v1/custom-terms/import.csv`
- `GET /api/v1/custom-terms/export`
- `DELETE /api/v1/custom-terms/{term_id}`
- `POST /api/check`
- `POST /api/rewrite`
- `POST /api/lookup`
- `POST /api/custom-terms`
- `GET /api/custom-terms`

## Behavior

- Core checking works without an external AI provider.
- Every issue includes a stable ID, issue type, severity, offsets, confidence, and ranked suggestions.
- Rewrite responses explain which transformations were applied.
- `/api/v1` is canonical; `/api` is retained as a compatibility prefix for the same route set.
- Custom terms are stored per `user_id` and returned as `{ items, count }`.
- Diagnostics expose configuration/status metadata only, not document text.

HTTP smoke verified on 2026-07-11 with a temporary SQLite database: health,
check, custom-term create/list, lookup, and local rewrite all passed.
