"""Small security/privacy middleware with no raw-body logging."""

from __future__ import annotations

import logging
import time
from collections import defaultdict, deque

from fastapi import Request, Response
from starlette.datastructures import Headers
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp, Message, Receive, Scope, Send

LOGGER = logging.getLogger("skryfwys.audit")


class RequestSizeLimitMiddleware:
    """Reject declared request bodies above the configured byte limit."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            headers = Headers(scope=scope)
            content_length = headers.get("content-length")
            if content_length:
                try:
                    too_large = int(content_length) > self.max_bytes
                except ValueError:
                    too_large = True
                if too_large:
                    response = Response(
                        content='{"detail":"Request body too large"}',
                        status_code=413,
                        media_type="application/json",
                    )
                    await response(scope, receive, send)
                    return

            body = bytearray()
            more_body = True
            while more_body:
                message = await receive()
                if message["type"] != "http.request":
                    continue
                body.extend(message.get("body", b""))
                if len(body) > self.max_bytes:
                    response = Response(
                        content='{"detail":"Request body too large"}',
                        status_code=413,
                        media_type="application/json",
                    )
                    await response(scope, receive, send)
                    return
                more_body = bool(message.get("more_body", False))

            replayed = False

            async def replay_receive() -> Message:
                nonlocal replayed
                if not replayed:
                    replayed = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return {"type": "http.disconnect"}

            await self.app(scope, replay_receive, send)
            return
        await self.app(scope, receive, send)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-process IP limiter suitable for local/single-instance deployments."""

    def __init__(self, app: ASGIApp, requests: int, window_seconds: int) -> None:
        super().__init__(app)
        self.requests = requests
        self.window_seconds = window_seconds
        self.buckets: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in {"/health", "/api/v1/health", "/api/health"}:
            return await call_next(request)
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = self.buckets[key]
        cutoff = now - self.window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= self.requests:
            retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)
        return await call_next(request)


class SecurityAndAuditMiddleware(BaseHTTPMiddleware):
    """Set browser defenses and log request metadata only."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        started = time.perf_counter()
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        response.headers.setdefault("Cache-Control", "no-store")
        duration_ms = round((time.perf_counter() - started) * 1_000, 2)
        # Deliberately exclude query strings, headers, body, and response body.
        LOGGER.info(
            "api_request method=%s path=%s status=%s duration_ms=%s content_length=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request.headers.get("content-length", "unknown"),
        )
        return response
