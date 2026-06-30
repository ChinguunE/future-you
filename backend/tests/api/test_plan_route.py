"""Integration tests for ``POST /plan`` (the composite compute endpoint).

These drive the real route end-to-end over the committed snapshots: a well-formed
request returns a coherent plan, a user's picks come back explained (NVIDIA capped,
an unknown ticker excluded — never silently dropped), the same request is byte-for-
byte reproducible, malformed input is a clean 422, and the security headers are set.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _request() -> dict:
    return {
        "profile": {
            "age": 30,
            "income_stability": 0.8,
            "emergency_fund_months": 6,
            "goals": [{"kind": "retirement", "horizon_years": 35, "target_amount": 1_000_000}],
        },
        "risk_answers": [4, 4, 3, 4, 4],
        "money": {"initial": 10_000, "monthly_contribution": 500},
        "picks": ["NVDA"],
    }


def test_plan_happy_path_returns_a_coherent_plan() -> None:
    resp = client.post("/plan", json=_request())
    assert resp.status_code == 200
    body = resp.json()

    weights = [h["weight"] for h in body["allocation"]["holdings"]]
    assert sum(weights) == pytest.approx(1.0, abs=1e-9)
    assert "retirement" in body["scenarios"]
    assert [s["key"] for s in body["ips"]][0] == "plan_at_a_glance"
    assert len(body["ips"]) == 12
    assert body["risk"]["effective_band"]  # the de-risking bridge is present
    assert body["retirement"]["capital_needed"] == 1_000_000
    # The projection cone is sampled to aligned series.
    bands = body["projection"]["bands"]
    assert len(bands["months"]) == len(bands["p50"]) > 1


def test_a_pick_comes_back_explained_not_dropped() -> None:
    body = client.post("/plan", json=_request()).json()
    nvda = next(p for p in body["picks"] if p["ticker"] == "NVDA")
    assert nvda["weight"] > 0.0
    assert nvda["note_code"] == "reduced_for_risk"
    assert nvda["screen_passed"] is False
    assert "beta_too_high" in nvda["screen_reasons"]


def test_an_unknown_ticker_is_surfaced_as_excluded() -> None:
    payload = _request()
    payload["picks"] = ["ZZZZ"]
    body = client.post("/plan", json=payload).json()
    (pick,) = body["picks"]
    assert pick["ticker"] == "ZZZZ"
    assert pick["note_code"] == "excluded_not_in_universe"
    assert pick["weight"] == 0.0


def test_same_request_is_reproducible() -> None:
    payload = _request()
    first = client.post("/plan", json=payload).json()
    second = client.post("/plan", json=payload).json()
    assert first == second  # fixed seed + committed snapshots → identical plan


def test_malformed_request_is_a_clean_422() -> None:
    payload = _request()
    payload["risk_answers"] = [9, 9, 9]  # out of the 1–5 Likert range
    resp = client.post("/plan", json=payload)
    assert resp.status_code == 422


def test_security_headers_are_present_on_plan() -> None:
    resp = client.post("/plan", json=_request())
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
