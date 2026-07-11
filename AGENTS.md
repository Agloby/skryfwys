# AGENTS.md

## Repository structure

- `apps/web`: primary user-facing editor
- `services/api`: FastAPI service and persistence
- `services/language_engine`: deterministic Afrikaans engine and evaluation code
- `packages/shared-types`: TypeScript contracts that mirror API payloads
- `data`: original seed dictionaries, terminology, and evaluation data
- `docs`: design, security, privacy, deployment, roadmap, and limitations

## Setup commands

- Backend: `python -m pip install -e .[dev]`
- Frontend: `npm install --prefix apps/web`
- API dev server: `python -m uvicorn services.api.app.main:app --reload --port 8000`
- Web dev server: `npm run dev --prefix apps/web`

## Architectural boundaries

- Keep deterministic language logic inside `services/language_engine`.
- Keep API transport, auth, and persistence concerns inside `services/api`.
- Keep UI state and rendering inside `apps/web`.
- Avoid coupling the engine to any specific AI provider.
- Use adapters for licensed or third-party language resources.

## Coding standards

- Prefer small, typed, testable functions.
- Default to deterministic behavior for core checking.
- Clearly label AI-generated output and keep it optional.
- Preserve user text fidelity for names, dates, money, URLs, and quoted text.
- Keep user-facing strings translatable.

## Test commands

- `python -m pytest`
- `python -m services.language_engine.evaluation`
- `npm run test --prefix apps/web`
- `npm run build --prefix apps/web`

## Prohibited shortcuts

- Do not embed copyrighted HAT or WAT content without a license.
- Do not log raw user text by default.
- Do not disable failing tests to force green builds.
- Do not mark unfinished integrations as complete.

## Privacy requirements

- Local mode must keep deterministic checks local to the Skryfwys backend.
- Cloud AI must be opt-in and clearly indicated.
- Store only metadata by default for diagnostics.

## Data-licensing requirements

- Every external dataset or dictionary needs a documented source and license.
- When licensing is uncertain, create an adapter and setup notes instead of bundling data.

## Definition of done

- API and web editor run locally.
- Known spelling and rule issues are detected with stable offsets.
- Users can accept suggestions and add custom terms.
- Tests pass and limitations are documented honestly.

