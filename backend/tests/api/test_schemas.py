"""Tests for the API request/response models (`app.api.schemas`).

The request models are the guard rail: they must accept a well-formed plan request
(applying sensible defaults) and reject malformed input — out-of-range Likert
answers, impossible ages, unknown goal kinds, and stray fields — so bad data is
turned away at the edge, not deep in the engine. The response model must accept the
full plan shape and round-trip to JSON.
"""

import pytest
from pydantic import ValidationError

from app.api.schemas import PlanRequest, PlanResponse


def _valid_request() -> dict:
    return {
        "profile": {
            "age": 30,
            "goals": [{"kind": "retirement", "horizon_years": 35, "target_amount": 1_000_000}],
        },
        "risk_answers": [4, 4, 3, 4, 4],
        "money": {"initial": 10_000, "monthly_contribution": 500},
        "picks": ["NVDA"],
    }


# --- Request: happy path + defaults ----------------------------------------


def test_minimal_request_parses_and_applies_defaults() -> None:
    req = PlanRequest.model_validate(_valid_request())
    assert req.profile.retirement_age == 65  # default
    assert req.profile.income_stability == 1.0
    assert req.profile.has_high_interest_debt is False
    assert req.money.annual_budget is None
    assert req.picks == ["NVDA"]


def test_picks_default_to_empty() -> None:
    payload = _valid_request()
    del payload["picks"]
    req = PlanRequest.model_validate(payload)
    assert req.picks == []


# --- Request: validation rejects bad input ---------------------------------


@pytest.mark.parametrize("bad", [0, 6, -1])
def test_likert_answers_must_be_one_to_five(bad: int) -> None:
    payload = _valid_request()
    payload["risk_answers"] = [3, bad, 3]
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_risk_answers_cannot_be_empty() -> None:
    payload = _valid_request()
    payload["risk_answers"] = []
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_age_is_bounded() -> None:
    payload = _valid_request()
    payload["profile"]["age"] = -3
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_income_stability_must_be_a_fraction() -> None:
    payload = _valid_request()
    payload["profile"]["income_stability"] = 1.5
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_unknown_goal_kind_is_rejected() -> None:
    payload = _valid_request()
    payload["profile"]["goals"] = [{"kind": "lambo", "horizon_years": 5}]
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_unknown_top_level_field_is_rejected() -> None:
    payload = _valid_request()
    payload["currency"] = "USD"  # not a field — CHF is fixed at the data layer
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


def test_negative_money_is_rejected() -> None:
    payload = _valid_request()
    payload["money"]["initial"] = -100
    with pytest.raises(ValidationError):
        PlanRequest.model_validate(payload)


# --- Response: accepts the full plan shape and round-trips -----------------


def _valid_response() -> dict:
    return {
        "as_of": "2026-06-30",
        "horizon_years": 35.0,
        "seed": 12345,
        "risk": {
            "willingness": 70.0,
            "ability": 65.0,
            "score": 65.0,
            "band": "moderately_aggressive",
            "adjusted_score": 65.0,
            "effective_band": "moderately_aggressive",
        },
        "scenarios": ["retirement"],
        "allocation": {
            "sleeves": {"equity": 0.66, "bond": 0.24, "cash": 0.05, "diversifier": 0.05},
            "holdings": [
                {
                    "ticker": "VWCE.DE",
                    "name": "FTSE All-World",
                    "asset_class": "world_equity",
                    "role": "core",
                    "weight": 0.62,
                    "is_satellite": False,
                    "cap": None,
                    "risk_contribution": 0.78,
                }
            ],
            "core_weight": 0.95,
            "satellite_weight": 0.05,
        },
        "tilt_cost": {
            "optimal_return": 0.05,
            "tilted_return": 0.051,
            "optimal_risk": 0.12,
            "tilted_risk": 0.125,
            "optimal_sharpe": 0.41,
            "tilted_sharpe": 0.40,
        },
        "picks": [
            {
                "ticker": "NVDA",
                "name": "NVIDIA",
                "weight": 0.034,
                "cap": 0.034,
                "note_code": "reduced_for_risk",
                "screen_passed": False,
                "screen_reasons": ["beta_too_high"],
            }
        ],
        "projection": {
            "bands": {
                "months": [0, 1],
                "p10": [10000.0, 10500.0],
                "p50": [10000.0, 10520.0],
                "p90": [10000.0, 10540.0],
            },
            "median_terminal": 500_000.0,
            "low_terminal": 300_000.0,
            "high_terminal": 800_000.0,
            "goal_funding_probability": 0.42,
        },
        "analytics": {
            "expected_return": 0.051,
            "volatility": 0.125,
            "sharpe": 0.40,
            "value_at_risk_monthly": 0.06,
            "conditional_var_monthly": 0.07,
            "worst_year_loss": 0.19,
        },
        "retirement": {"capital_needed": 1_000_000.0, "required_monthly_contribution": 900.0},
        "three_a": {"pillar_3a": 6000.0, "taxable": 0.0},
        "ips": [
            {
                "key": "plan_at_a_glance",
                "fields": {"risk_band": "moderately_aggressive", "scenarios": ["retirement"]},
            }
        ],
    }


def test_full_response_validates_and_serialises() -> None:
    resp = PlanResponse.model_validate(_valid_response())
    dumped = resp.model_dump()
    assert dumped["risk"]["effective_band"] == "moderately_aggressive"
    assert dumped["picks"][0]["note_code"] == "reduced_for_risk"
    # Round-trips through JSON without loss.
    assert PlanResponse.model_validate_json(resp.model_dump_json()) == resp


def test_response_retirement_is_optional() -> None:
    payload = _valid_response()
    payload["retirement"] = None
    resp = PlanResponse.model_validate(payload)
    assert resp.retirement is None
