"""Risk profiling (METHODOLOGY §6).

Two independent readings on a 0–100 scale:

* **willingness** — attitude, from a short questionnaire (how the user *feels*
  about risk);
* **ability** — objective capacity to bear it, from horizon, income stability,
  and emergency cushion.

Suitable risk is the **minimum** of the two — the prudent-investor rule that you
never take more risk than the lower reading allows — which then maps to one
profile band.
"""

from __future__ import annotations

from enum import StrEnum
from typing import NamedTuple

import numpy as np
from numpy.typing import ArrayLike

__all__ = [
    "RiskBand",
    "RiskProfile",
    "willingness_score",
    "ability_score",
    "profile_band",
    "risk_profile",
]

# Ability sub-scores blend with these weights (sum to 1).
_HORIZON_WEIGHT = 0.5
_INCOME_WEIGHT = 0.25
_CUSHION_WEIGHT = 0.25

# "Full marks" thresholds for the ability inputs.
_FULL_HORIZON_YEARS = 20.0
_FULL_CUSHION_MONTHS = 6.0


class RiskBand(StrEnum):
    """One suitable risk level, from a 0–100 score."""

    CONSERVATIVE = "conservative"
    MODERATELY_CONSERVATIVE = "moderately_conservative"
    BALANCED = "balanced"
    MODERATELY_AGGRESSIVE = "moderately_aggressive"
    AGGRESSIVE = "aggressive"


class RiskProfile(NamedTuple):
    """The two readings, the binding (minimum) score, and its band."""

    willingness: float
    ability: float
    score: float
    band: RiskBand


def willingness_score(answers: ArrayLike) -> float:
    """Map Likert answers (1–5) to a 0–100 willingness score.

    1 ("strongly disagree with taking risk") → 0; 5 → 100; the mean is used so
    the number of questions does not change the scale.
    """
    responses = np.asarray(answers, dtype=np.float64)
    if responses.ndim != 1 or responses.size == 0:
        raise ValueError("answers must be a non-empty 1-D sequence")
    if np.any(responses < 1.0) or np.any(responses > 5.0):
        raise ValueError("Likert answers must each be between 1 and 5")
    return float((np.mean(responses) - 1.0) / 4.0 * 100.0)


def ability_score(
    *, horizon_years: float, income_stability: float, emergency_fund_months: float
) -> float:
    """Objective capacity to bear risk, on 0–100.

    A longer horizon, steadier income, and bigger cushion all raise capacity;
    each input is clamped at its "full marks" level before blending.
    """
    if horizon_years < 0 or emergency_fund_months < 0:
        raise ValueError("horizon and cushion must be non-negative")
    if not 0.0 <= income_stability <= 1.0:
        raise ValueError("income_stability must be in [0, 1]")
    horizon = min(horizon_years / _FULL_HORIZON_YEARS, 1.0) * 100.0
    income = income_stability * 100.0
    cushion = min(emergency_fund_months / _FULL_CUSHION_MONTHS, 1.0) * 100.0
    return float(
        _HORIZON_WEIGHT * horizon + _INCOME_WEIGHT * income + _CUSHION_WEIGHT * cushion
    )


def profile_band(score: float) -> RiskBand:
    """Map a 0–100 score to one of five bands (lower bound inclusive)."""
    if not 0.0 <= score <= 100.0:
        raise ValueError("score must be between 0 and 100")
    if score < 20.0:
        return RiskBand.CONSERVATIVE
    if score < 40.0:
        return RiskBand.MODERATELY_CONSERVATIVE
    if score < 60.0:
        return RiskBand.BALANCED
    if score < 80.0:
        return RiskBand.MODERATELY_AGGRESSIVE
    return RiskBand.AGGRESSIVE


def risk_profile(willingness: float, ability: float) -> RiskProfile:
    """Combine the two readings: suitable risk is the minimum, then its band."""
    score = min(willingness, ability)
    return RiskProfile(
        willingness=float(willingness),
        ability=float(ability),
        score=float(score),
        band=profile_band(score),
    )
