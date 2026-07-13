# Managed hosting readiness

This guide keeps Skryfwys local-first today while making a managed deployment
straightforward later. It is intentionally provider-neutral: Render, Fly.io,
Railway, Azure Container Apps, Google Cloud Run, AWS App Runner, and similar
platforms should all map to the same service shape.

## Recommended service shape

Create three managed resources:

1. **API service**
   - Build from `infrastructure/api.Dockerfile`.
   - Expose container port `8000`.
   - Health check: `GET /api/v1/health`.
   - Needs private secrets and database access.

2. **Web service**
   - Build from `infrastructure/web.Dockerfile`.
   - Expose container port `4173`.
   - Health check: `GET /`.
   - Should route `/api/*` and `/health` to the API service.

3. **Managed PostgreSQL**
   - Use TLS if the provider supports it.
   - Enable automated backups before inviting other users.
   - Keep the database private to the API service where possible.

For the first managed deploy, keep one API instance and one web instance. Add
horizontal scaling only after a shared rate limiter and proper account isolation
exist.

## API environment variables

Set these on the API service only:

```env
SKRYFWYS_ENV=production
SKRYFWYS_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
SKRYFWYS_CORS_ORIGINS=https://skryfwys.example.com
SKRYFWYS_TRUSTED_HOSTS=skryfwys.example.com,api-skryfwys.example.com
SKRYFWYS_DIAGNOSTICS_ENABLED=false
SKRYFWYS_RATE_LIMIT_REQUESTS=120
SKRYFWYS_RATE_LIMIT_WINDOW_SECONDS=60
SKRYFWYS_MAX_REQUEST_BYTES=120000

AI_PROVIDER=openai
AI_MODEL=gpt-5-mini
AI_BASE_URL=https://api.openai.com
OPENAI_API_KEY=provider-secret-value
AI_TIMEOUT_SECONDS=20
AI_MAX_INPUT_CHARACTERS=20000
AI_DAILY_BUDGET=1
```

Set `AI_DAILY_BUDGET=0` to disable cloud AI in production. Never set
`OPENAI_API_KEY` on the web/static service.

## Web environment variables

The current Docker web image serves static files and same-origin API paths. If a
platform deploys the web service separately from the API service without an
internal reverse proxy, build the web app with:

```env
VITE_API_BASE_URL=https://api-skryfwys.example.com
VITE_API_PREFIX=/api/v1
```

If the web service can proxy `/api` to the API service, prefer same-origin access
and keep `VITE_API_BASE_URL` empty.

## Deployment checklist

- Select one region close to the primary users.
- Create managed PostgreSQL and copy its SQLAlchemy connection URL into
  `SKRYFWYS_DATABASE_URL`.
- Create the API service from `infrastructure/api.Dockerfile`.
- Create the web service from `infrastructure/web.Dockerfile`.
- Store all secrets in the provider's secret manager, not in Git.
- Set exact HTTPS origins in `SKRYFWYS_CORS_ORIGINS`.
- Disable public diagnostics for shared or public deployments.
- Verify `GET /api/v1/health` before connecting the web service.
- Verify a deterministic `/api/v1/check` request before enabling cloud AI.
- Enable cloud AI only after confirming budget and privacy wording.
- Configure backups and a restore drill before inviting other users.

## Smoke tests after deploy

Run equivalent checks from your machine:

```powershell
Invoke-RestMethod https://skryfwys.example.com/api/v1/health

$body = @{ text = "Hiedie dokument is gereed."; user_id = "guest" } | ConvertTo-Json
Invoke-RestMethod https://skryfwys.example.com/api/v1/check `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

For a cloud-AI smoke test, use a tiny sentence and confirm `ai_used` is `true`.
Do not use sensitive text for provider validation.

## Current local decision

The current deployment choice is **Local only**. Managed-hosting assets are kept
ready so the project can move later without changing the core architecture.
