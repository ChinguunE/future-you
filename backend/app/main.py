"""Future You API — application factory.

A minimal, secure-by-default service: the composite `POST /plan` compute endpoint
plus snapshot-read `GET`s, all behind locked CORS and baseline security headers.
"""

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api import plan
from app.config import get_settings

settings = get_settings()

# Stamped once at process start — no per-request work.
SERVICE_AS_OF = datetime.now(UTC).date().isoformat()

app = FastAPI(
    title="Future You API",
    description="The finance engine + research-data service for Future You.",
    version="0.0.1",
)

# Lock CORS to our own site(s) only — never "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add a baseline of safe response headers to every reply."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check — used by the keep-warm cron and the landing-page wake ping."""
    return {"status": "ok", "service": "future-you-api", "as_of": SERVICE_AS_OF}


app.include_router(plan.router)
