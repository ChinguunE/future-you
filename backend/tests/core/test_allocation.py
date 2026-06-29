"""Known-answer / invariant tests for `core.allocation` (METHODOLOGY §7).

Strategic allocation: a risk score becomes sleeve weights (equity / bond / cash
/ diversifier); a diversified core carries a capped satellite; horizon shapes
the mix (soon-money safer than decades-money, and a glide path de-risks as the
goal approaches); and a Swiss 3a-first funding order.
"""

import pytest

from core import allocation

# --- Sleeve weights (the strategic asset allocation) -----------------------


def test_sleeve_weights_sum_to_one_across_the_range() -> None:
    for score in (0, 25, 50, 75, 100):
        sleeves = allocation.sleeve_weights(score)
        total = sleeves.equity + sleeves.bond + sleeves.cash + sleeves.diversifier
        assert total == pytest.approx(1.0)


def test_sleeve_weights_known_endpoints() -> None:
    conservative = allocation.sleeve_weights(0)
    assert conservative.equity == pytest.approx(0.20)
    assert conservative.bond == pytest.approx(0.60)
    assert conservative.cash == pytest.approx(0.15)
    assert conservative.diversifier == pytest.approx(0.05)

    aggressive = allocation.sleeve_weights(100)
    assert aggressive.equity == pytest.approx(0.90)
    assert aggressive.bond == pytest.approx(0.05)
    assert aggressive.cash == pytest.approx(0.0)
    assert aggressive.diversifier == pytest.approx(0.05)


def test_more_risk_means_more_equity_and_less_bond() -> None:
    low = allocation.sleeve_weights(20)
    high = allocation.sleeve_weights(80)
    assert high.equity > low.equity
    assert high.bond < low.bond


# --- Core + capped satellite ----------------------------------------------


def test_satellite_is_capped() -> None:
    greedy = allocation.core_satellite(0.30, cap=0.20)
    assert greedy.satellite == pytest.approx(0.20)  # request clipped to the cap
    assert greedy.core == pytest.approx(0.80)
    assert greedy.core + greedy.satellite == pytest.approx(1.0)

    modest = allocation.core_satellite(0.10, cap=0.20)
    assert modest.satellite == pytest.approx(0.10)  # under the cap, untouched


# --- Goals-based (short vs long money differ) ------------------------------


def test_short_horizon_money_is_more_conservative_than_long() -> None:
    # Same appetite, different goal horizons: soon-money must hold less equity.
    soon = allocation.horizon_adjusted_sleeves(base_score=100, years=2)
    later = allocation.horizon_adjusted_sleeves(base_score=100, years=30)
    assert soon.equity < later.equity


# --- Glide path (risk falls as the horizon shortens) -----------------------


def test_glide_path_de_risks_as_the_goal_approaches() -> None:
    # Same goal and appetite, less time left -> strictly less equity.
    far = allocation.horizon_adjusted_sleeves(base_score=80, years=20)
    near = allocation.horizon_adjusted_sleeves(base_score=80, years=5)
    nearer = allocation.horizon_adjusted_sleeves(base_score=80, years=2)
    assert far.equity > near.equity > nearer.equity


def test_horizon_adjustment_never_raises_risk_above_appetite() -> None:
    # A long horizon cannot push risk above the user's own willingness/ability.
    assert allocation.horizon_adjusted_score(base_score=40, years=50) == pytest.approx(40.0)
    # A short horizon caps it below appetite.
    assert allocation.horizon_adjusted_score(base_score=100, years=10) == pytest.approx(50.0)


# --- Swiss 3a-first funding order ------------------------------------------


def test_pillar_3a_is_filled_first() -> None:
    # 2026 employee cap (CHF 7,258) is passed in, not hard-coded in the engine.
    split = allocation.pillar_3a_split(10_000, annual_limit=7_258)
    assert split.pillar_3a == pytest.approx(7_258)
    assert split.taxable == pytest.approx(2_742)

    under = allocation.pillar_3a_split(5_000, annual_limit=7_258)
    assert under.pillar_3a == pytest.approx(5_000)
    assert under.taxable == pytest.approx(0.0)
