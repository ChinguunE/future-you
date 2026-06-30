"""Tests for the security headers, locked CORS, and caching policy.

The baseline security headers must cover every route type (compute and reads); CORS
must allow our own origin and the methods we use, never `*`; and the caching policy
must let the static snapshot reads be cached while keeping the personal compute and
the liveness check out of any cache.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_SECURITY_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
}

_ORIGIN = "http://localhost:3000"


def _plan_request() -> dict:
    return {
        "profile": {"age": 30, "goals": []},
        "risk_answers": [4, 4, 3],
        "money": {"initial": 10_000, "monthly_contribution": 500},
    }


def test_security_headers_on_every_route_type() -> None:
    responses = [
        client.get("/health"),
        client.get("/cma"),
        client.post("/plan", json=_plan_request()),
    ]
    for resp in responses:
        for header, value in _SECURITY_HEADERS.items():
            assert resp.headers[header] == value


def test_cors_allows_our_own_origin() -> None:
    resp = client.get("/cma", headers={"Origin": _ORIGIN})
    assert resp.headers["access-control-allow-origin"] == _ORIGIN


def test_cors_preflight_permits_post_plan_with_json() -> None:
    resp = client.options(
        "/plan",
        headers={
            "Origin": _ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert resp.status_code == 200
    assert "POST" in resp.headers["access-control-allow-methods"]


def test_reads_are_cacheable() -> None:
    for path in ("/universe", "/cma", "/glossary", "/assets/CSPX.L"):
        resp = client.get(path)
        assert resp.status_code == 200
        assert resp.headers["cache-control"] == "public, max-age=3600"


def test_compute_and_health_are_not_cached() -> None:
    assert client.post("/plan", json=_plan_request()).headers["cache-control"] == "no-store"
    assert client.get("/health").headers["cache-control"] == "no-store"


def test_a_read_error_is_not_cached() -> None:
    resp = client.get("/assets/NOPE")
    assert resp.status_code == 404
    assert resp.headers["cache-control"] == "no-store"
