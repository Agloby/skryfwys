# syntax=docker/dockerfile:1.7
FROM python:3.12-slim-bookworm AS wheel-builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /build

COPY pyproject.toml README.md ./
COPY services ./services
RUN python -m pip wheel --wheel-dir /wheels .

FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    SKRYFWYS_ENVIRONMENT=production

RUN groupadd --gid 10001 skryfwys \
    && useradd --uid 10001 --gid skryfwys --no-create-home --shell /usr/sbin/nologin skryfwys

WORKDIR /app
COPY --from=wheel-builder /wheels /wheels
RUN python -m pip install --no-cache-dir /wheels/*.whl \
    && rm -rf /wheels

# Keep source at /app so the deterministic engine can resolve verified resources at /app/data.
COPY --chown=skryfwys:skryfwys services ./services
COPY --chown=skryfwys:skryfwys data ./data
RUN mkdir -p /app/data /app/state \
    && chown -R skryfwys:skryfwys /app

USER 10001:10001
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).read()"]

CMD ["python", "-m", "uvicorn", "services.api.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
