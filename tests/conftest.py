from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from services.api.app.config import Settings
from services.api.app.main import create_app


@pytest.fixture
def settings(tmp_path) -> Settings:
    database_path = (tmp_path / "skryfwys-test.db").as_posix()
    return Settings(
        SKRYFWYS_ENV="test",
        SKRYFWYS_DATABASE_URL=f"sqlite:///{database_path}",
        SKRYFWYS_RATE_LIMIT_REQUESTS=1_000,
        SKRYFWYS_MAX_REQUEST_BYTES=120_000,
        SKRYFWYS_DIAGNOSTICS_ENABLED=True,
        AI_PROVIDER="",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client
