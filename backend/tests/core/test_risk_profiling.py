"""Known-answer tests for `core.risk_profiling` (METHODOLOGY §6).

Suitable risk is the *minimum* of willingness (attitude) and ability (horizon,
income stability, cushion) — you never take more risk than the lower of the two
allows. A single score then maps to one profile band.
"""

import pytest

from core import risk_profiling
from core.risk_profiling import RiskBand

# --- Willingness (questionnaire) ------------------------------------------


def test_willingness_score_maps_likert_to_0_100() -> None:
    assert risk_profiling.willingness_score([3, 3, 3, 3]) == pytest.approx(50.0)
    assert risk_profiling.willingness_score([5, 5]) == pytest.approx(100.0)
    assert risk_profiling.willingness_score([1, 1]) == pytest.approx(0.0)


# --- Ability (objective capacity) -----------------------------------------


def test_ability_score_known_weighting() -> None:
    # horizon 10y -> 50; income 1.0 -> 100; cushion 6mo -> 100.
    # weighted 0.5*50 + 0.25*100 + 0.25*100 = 75.
    score = risk_profiling.ability_score(
        horizon_years=10, income_stability=1.0, emergency_fund_months=6
    )
    assert score == pytest.approx(75.0)


def test_ability_score_floor_and_ceiling() -> None:
    floor = risk_profiling.ability_score(
        horizon_years=0, income_stability=0.0, emergency_fund_months=0
    )
    ceiling = risk_profiling.ability_score(
        horizon_years=40, income_stability=1.0, emergency_fund_months=12
    )
    assert floor == pytest.approx(0.0)
    assert ceiling == pytest.approx(100.0)  # inputs beyond full are clamped


# --- Profile bands (boundaries) -------------------------------------------


def test_profile_band_boundaries() -> None:
    assert risk_profiling.profile_band(0) == RiskBand.CONSERVATIVE
    assert risk_profiling.profile_band(19.99) == RiskBand.CONSERVATIVE
    assert risk_profiling.profile_band(20) == RiskBand.MODERATELY_CONSERVATIVE
    assert risk_profiling.profile_band(40) == RiskBand.BALANCED
    assert risk_profiling.profile_band(60) == RiskBand.MODERATELY_AGGRESSIVE
    assert risk_profiling.profile_band(80) == RiskBand.AGGRESSIVE
    assert risk_profiling.profile_band(100) == RiskBand.AGGRESSIVE


# --- The minimum binds (the safety property) ------------------------------


def test_the_lower_of_willingness_and_ability_binds() -> None:
    # High appetite, low capacity -> capacity wins.
    cautious = risk_profiling.risk_profile(willingness=95, ability=10)
    assert cautious.score == pytest.approx(10.0)
    assert cautious.band == RiskBand.CONSERVATIVE

    # Low appetite, high capacity -> appetite wins.
    timid = risk_profiling.risk_profile(willingness=25, ability=90)
    assert timid.score == pytest.approx(25.0)
    assert timid.band == RiskBand.MODERATELY_CONSERVATIVE

    # The score is always exactly the minimum of the two.
    assert risk_profiling.risk_profile(70, 70).score == pytest.approx(70.0)
