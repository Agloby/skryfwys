# Windows setup

## Prerequisites

- Python 3.12 or later (`py --list` shows installed interpreters)
- Node.js 22 LTS or a compatible later release and npm
- Git
- Optional: Docker Desktop for container verification
- Optional: GNU Make; every required workflow has a PowerShell equivalent

Avoid placing the repository in a path that an organisation blocks from running
scripts. UNC paths work for Python/npm in many cases, but this release was
verified by running Node commands from a local temporary copy because npm/Vitest
can otherwise hang or report misleading results on network shares.

## Setup

```powershell
py -3.12 -m venv .venv
Set-ExecutionPolicy -Scope Process Bypass
./.venv/Scripts/Activate.ps1
./scripts/setup.ps1
```

If Python 3.12 is not installed, select another listed interpreter that satisfies
`pyproject.toml`, for example `py -3.14 -m venv .venv`.

## Development

```powershell
./scripts/dev.ps1
```

The script starts the API and Vite dev server and reports their local URLs. Stop it
with `Ctrl+C`; if a child process remains, close that terminal or stop only the
reported Python/Node process rather than killing unrelated development sessions.

Manual two-terminal alternative:

```powershell
# terminal 1
./.venv/Scripts/Activate.ps1
python -m uvicorn services.api.app.main:app --reload --port 8000

# terminal 2
npm run dev --prefix apps/web
```

## Tests

```powershell
./scripts/test.ps1
python -m services.language_engine.evaluation
npm run build --prefix apps/web
```

When script execution is restricted for the user or machine, `Set-ExecutionPolicy
-Scope Process Bypass` changes only the current PowerShell process.

## Troubleshooting

- **`python` resolves to the Store alias:** use `py -3.12` to create the virtual
  environment, activate it, and confirm `Get-Command python` points inside `.venv`.
- **Port 8000 or 5173 is busy:** use `Get-NetTCPConnection -LocalPort 8000` (or
  5173) to identify the owner; change the port rather than stopping unknown work.
- **SQLite cannot open a UNC-path database:** set the database URL to a writable
  local absolute path or map the network location. Do not put a shared SQLite file
  behind several servers; use PostgreSQL.
- **npm native optional package issue:** remove only `apps/web/node_modules` and its
  lockfile when intentionally refreshing dependencies, then run `npm install` from
  the same Node architecture. Never delete unrelated workspace files.
- **Docker is unavailable:** run local Python/Vite verification and record the
  container build as unverified. When Docker is available, verify with
  `docker compose config`, `docker compose build`, `docker compose up -d`, and
  endpoint smoke checks before claiming container readiness.
- **UNC npm tests hang or report zero tests:** copy the app directory to a local
  temp folder excluding `node_modules`/`dist`, run `npm ci`, and execute the exact
  test command there. The browser extension can also be tested with
  `node --test test/safety.test.cjs` from its own directory.

## Current local workstation status

Verified on 2026-07-14:

- Docker Desktop local stack runs the API on `http://127.0.0.1:8000` and the web
  app on `http://127.0.0.1:4173`.
- The unpacked Chrome extension works from
  `G:\My Drive\Afrikaans AI Writing Assistant\apps\browser-extension` for normal
  text fields.
- Word desktop can load the Skryfwys task pane through the trusted shared-folder
  catalog pointing at `apps\office-addin`.
- The Office task-pane development server responds on `https://localhost:3001`
  when started from the Office add-in project.

After a reboot, start Docker Desktop and run:

```powershell
docker compose up -d
```

For Word add-in development, also start:

```powershell
npm run dev --prefix apps/office-addin
```
