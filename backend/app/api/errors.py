"""Friendly, bilingual-ready error handling.

Every error leaves the API in one stable envelope::

    {"error": {"code": "<machine_code>", "message": "<dev-facing english>",
               "fields": [...]}}   # fields only on validation errors

The UI renders the EN/FR copy from ``code`` (the ``message`` is a developer
fallback, never shown to users). Tracebacks are logged server-side and never
appear in a response. Domain errors raise :class:`ApiError` with an explicit
code; framework and unexpected errors are mapped here.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.snapshots.loader import SnapshotError

logger = logging.getLogger("future_you.api")

# Framework HTTP statuses → stable codes (our own errors use ApiError directly).
_HTTP_CODES: dict[int, str] = {
    400: "bad_request",
    404: "not_found",
    405: "method_not_allowed",
    422: "validation_error",
}


class ApiError(Exception):
    """A domain error carrying a stable code the UI can localise."""

    def __init__(
        self,
        *,
        code: str,
        status_code: int = 400,
        message: str = "",
        fields: list[dict[str, Any]] | None = None,
    ) -> None:
        self.code = code
        self.status_code = status_code
        self.message = message or code
        self.fields = fields
        super().__init__(self.message)


def _envelope(
    code: str, message: str, fields: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if fields is not None:
        error["fields"] = fields
    return {"error": error}


def register_error_handlers(app: FastAPI) -> None:
    """Install the handlers that turn every error into the stable envelope."""

    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, exc.fields),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {
                "field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]),
                "code": e["type"],
                "message": e["msg"],
            }
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_envelope("validation_error", "Request validation failed", fields),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_CODES.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else code
        return JSONResponse(status_code=exc.status_code, content=_envelope(code, message))

    @app.exception_handler(SnapshotError)
    async def _snapshot(_: Request, exc: SnapshotError) -> JSONResponse:
        logger.error("snapshot unavailable: %s", exc)
        return JSONResponse(
            status_code=503,
            content=_envelope("data_unavailable", "The research data is temporarily unavailable."),
        )

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error")  # traceback to the logs, never the body
        return JSONResponse(
            status_code=500,
            content=_envelope("internal_error", "An unexpected error occurred."),
        )
