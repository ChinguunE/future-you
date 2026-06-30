"""Tests for the stable error envelope.

Every error must come back as {"error": {"code", "message", ...}} so the UI can
render EN/FR copy from the machine code — and a traceback must never reach the
body. Covers validation, not-found, snapshot-unavailable, and the unexpected-error
catch-all.
"""

import pytest
from fastapi.testclient import TestClient

from app.api import data
from app.api.errors import ApiError
from app.main import app
from app.snapshots.loader import SnapshotError

client = TestClient(app)


def _request() -> dict:
    return {
        "profile": {"age": 30, "goals": []},
        "risk_answers": [4, 4, 3],
        "money": {"initial": 10_000, "monthly_contribution": 500},
    }


def test_validation_error_uses_the_envelope_with_fields() -> None:
    payload = _request()
    payload["risk_answers"] = [9]  # out of range
    resp = client.post("/plan", json=payload)
    assert resp.status_code == 422
    error = resp.json()["error"]
    assert error["code"] == "validation_error"
    assert error["fields"]  # points at the offending field
    assert any("risk_answers" in f["field"] for f in error["fields"])


def test_not_found_uses_the_envelope() -> None:
    error = client.get("/assets/NOPE").json()["error"]
    assert error["code"] == "asset_not_found"
    assert "message" in error


def test_snapshot_unavailable_maps_to_503(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom() -> dict:
        raise SnapshotError("universe.json missing")

    monkeypatch.setattr(data, "universe_index", boom)
    resp = client.post("/plan", json=_request())
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "data_unavailable"


def test_unexpected_error_is_a_clean_500_with_no_traceback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def boom(*args: object, **kwargs: object) -> None:
        raise RuntimeError("kaboom in the engine")

    monkeypatch.setattr("app.api.plan.build_plan", boom)
    # raise_server_exceptions=False so we can inspect the 500 response itself.
    quiet = TestClient(app, raise_server_exceptions=False)
    resp = quiet.post("/plan", json=_request())
    assert resp.status_code == 500
    body = resp.text
    assert resp.json()["error"]["code"] == "internal_error"
    assert "kaboom" not in body and "Traceback" not in body  # nothing leaks


def test_engine_value_error_maps_to_invalid_plan_input(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(*args: object, **kwargs: object) -> None:
        raise ValueError("some engine precondition")

    monkeypatch.setattr("app.api.plan.build_plan", boom)
    resp = client.post("/plan", json=_request())
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "invalid_plan_input"


def test_api_error_carries_its_code() -> None:
    err = ApiError(code="asset_not_found", status_code=404)
    assert err.code == "asset_not_found"
    assert err.message == "asset_not_found"  # defaults to the code
