# Skryfwys

Skryfwys is a privacy-conscious Afrikaans writing assistant built around a deterministic checking engine, an optional AI rewrite layer, and a responsive web editor.

## What is included now

- FastAPI backend with health, check, rewrite, lookup, and custom-term endpoints
- Deterministic Afrikaans spell/style checking with original seed data
- SQLite-backed personal dictionary support
- React + Vite web editor for checking text and applying suggestions
- Manifest V3 browser-extension safety core and Office task-pane foundation
- Pytest and Vitest coverage for the core slice
- Evaluation harness with original Afrikaans test data

## Five-minute setup

1. Create a Python virtual environment and install backend dependencies:

   ```powershell
   py -3.14 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   python -m pip install -e .[dev]
   ```

2. Install the frontend dependencies:

   ```powershell
   npm install --prefix apps/web
   ```

3. Start the API:

   ```powershell
   python -m uvicorn services.api.app.main:app --reload --port 8000
   ```

4. Start the web app in a second terminal:

   ```powershell
   npm run dev --prefix apps/web
   ```

5. Open `http://localhost:5173`.

## Common commands

- `python -m pytest`
- `python -m ruff check .`
- `python -m ruff format --check .`
- `python -m services.language_engine.evaluation`
- `npm run test --prefix apps/web`
- `npm run build --prefix apps/web`
- `npm test --prefix apps/browser-extension`
- `npm test --prefix apps/office-addin`
- Managed-hosting prep: `infrastructure/managed-hosting.md`

## Project structure

```text
apps/
  web/                 React editor
  browser-extension/   Manifest V3 local-checking client foundation
  office-addin/        Word/Outlook task-pane foundation
  desktop/             PWA desktop notes
  ios/                 iOS integration notes
services/
  api/                 FastAPI service
  language_engine/     deterministic checker and evaluation tools
packages/
  shared-types/        shared request/response contracts
data/
  dictionaries/        original seed lexicon and terminology
  evaluation/          original evaluation datasets
docs/                  product, architecture, privacy, security, roadmap
scripts/               PowerShell helpers
tests/                 backend unit and integration tests
```

## Current status

The repository contains a verified first vertical slice: deterministic backend,
web editor, browser-extension safety core, Office task-pane foundation, scripts,
docs, and deployment scaffolding. Browser, Office, and iOS are not signed store
releases; their target-platform review and distribution work remains documented.
