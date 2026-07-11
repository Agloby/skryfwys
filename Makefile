setup:
	python -m pip install -e .[dev]
	npm install --prefix apps/web

dev:
	powershell -ExecutionPolicy Bypass -File ./scripts/dev.ps1

test:
	powershell -ExecutionPolicy Bypass -File ./scripts/test.ps1

test-unit:
	python -m pytest tests/unit

test-integration:
	python -m pytest tests/integration

test-e2e:
	npm run test --prefix apps/web

lint:
	python -m ruff check .
	npm run lint --prefix apps/web

typecheck:
	npm run typecheck --prefix apps/web

evaluate:
	python -m services.language_engine.evaluation

security-check:
	python -m ruff check .

build:
	npm run build --prefix apps/web

docker-up:
	docker compose up --build

docker-down:
	docker compose down

