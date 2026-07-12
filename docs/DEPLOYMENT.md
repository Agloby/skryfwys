# Deployment

## Configuration

Copy `.env.example` to `.env` and replace development values. The API validates
privacy/model limits at startup. Never expose `OPENAI_API_KEY` to the web build.

Important production settings include the database URL, CORS allowlist, maximum
body/input size, rate limit, public documentation/diagnostics switches, privacy
default, AI provider/model/base URL, timeout, input limit, and daily budget.

## Local self-hosting

```powershell
./scripts/setup.ps1
./scripts/dev.ps1
```

Or run the processes separately:

```powershell
python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 8000
npm run dev --prefix apps/web
```

Binding to `127.0.0.1` keeps a personal instance off the LAN. If other machines
need access, use a firewall and HTTPS reverse proxy rather than exposing Uvicorn
directly.

## Docker Compose

```sh
docker compose config
docker compose up --build -d
docker compose ps
curl --fail http://localhost:8000/health
docker compose down
```

The API and web images use non-root runtime users and health checks. Persist the
database/data volume outside disposable container layers. Compose is a convenient
single-host path, not automatic high availability.

## Small Linux VPS

1. Install a supported Docker Engine/Compose release and create a non-root deploy
   user. Clone a tagged Skryfwys release, not a mutable development branch.
2. Put secrets in a root-readable environment file outside the repository. Set a
   specific public web origin, disable public detailed diagnostics, and select
   private-server mode unless cloud AI is intentionally offered.
3. Use PostgreSQL for multiple users. Grant only schema/application permissions to
   the runtime role and place its volume on encrypted durable storage.
4. Put Caddy, Nginx, or Traefik in front. Redirect HTTP to HTTPS, configure HSTS
   only after TLS is stable, limit request bodies, and proxy `/api` to the API while
   serving the static web assets.
5. Run containers through a system service/restart policy, monitor health/status
   counts without document bodies, and apply OS/dependency updates deliberately.

`infrastructure/Caddyfile.example` provides a vendor-neutral reverse-proxy example
where present. Replace its host and upstream names before use.

## Managed container platform

Deploy the API and static web image separately or as two services. Use managed
PostgreSQL with TLS and automated backups; provide secrets through the platform's
secret manager; keep at least one API instance warm if low latency matters. A
distributed rate limiter is required before horizontally scaling. Configure the web
client's API base URL at build/deploy time and permit only its exact HTTPS origin.

Suitable capabilities are standard OCI containers, health probes, private service
networking, encrypted database/backups, secret injection, and regional selection;
the project does not require a particular vendor.

## Backup and restore

For a stopped personal SQLite instance, copy the database and terminology export
to encrypted storage and record application/schema version. For a live SQLite
database, use SQLite's online backup command rather than copying a possibly partial
file. PostgreSQL deployments use `pg_dump --format=custom` plus encrypted provider
snapshots.

Test restores quarterly into an isolated instance:

1. verify backup checksum and decrypt;
2. restore database with the matching release;
3. run migrations/health checks and inspect term counts;
4. check that no production provider credentials or outbound calls are enabled;
5. document duration, recovery point, and any missing data.

## Rollback

Keep the previous immutable images and a pre-migration backup. Database migrations
must declare whether downgrade is safe. If not, restore the backup with the prior
image rather than running old code against a newer schema.

## Verification status on this host

The project test/build commands are run on Windows. On 2026-07-12, Docker Desktop
29.6.1 and Docker Compose v5.2.0 were available on this host. The root compose
stack built successfully, both API and web containers reached healthy state, and
host smoke checks passed for:

- `GET http://127.0.0.1:8000/api/v1/health`
- `POST http://127.0.0.1:8000/api/v1/check`
- `GET http://127.0.0.1:4173`

The production compose file also rendered successfully with placeholder
`SKRYFWYS_DOMAIN`, `SKRYFWYS_ACME_EMAIL`, and `SKRYFWYS_POSTGRES_PASSWORD` values.
It was not deployed to a public host.
