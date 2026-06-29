"""Known-answer tests for `core.retirement` (METHODOLOGY §9, saving phase).

Fisher real rate, the capital needed to fund a retirement income, and the
required monthly contribution (verified as the exact inverse of the future-value
projection).
"""

import pytest

from core import retirement
from core.projections import fv_contributions, fv_lump_sum

# --- Fisher real rate ------------------------------------------------------


def test_real_rate_fisher_known() -> None:
    # (1 + 0.06) / (1 + 0.02) - 1
    assert retirement.real_rate(0.06, 0.02) == pytest.approx(1.06 / 1.02 - 1.0)
    # Returns that just keep pace with inflation have zero real growth.
    assert retirement.real_rate(0.05, 0.05) == pytest.approx(0.0)


# --- Capital needed (PV of a retirement income) ----------------------------


def test_capital_needed_zero_rate_is_income_times_years() -> None:
    assert retirement.capital_needed(40_000, 25, 0.0) == pytest.approx(1_000_000)


def test_capital_needed_matches_discounted_cashflows() -> None:
    income, years, rate = 40_000.0, 25, 0.04
    pv = retirement.capital_needed(income, years, rate, timing="begin")
    # Independent check: annuity-due means the first payment is undiscounted.
    expected = sum(income / (1.0 + rate) ** t for t in range(years))
    assert pv == pytest.approx(expected)


# --- Required contribution (inverse of the FV projection) ------------------


def test_required_contribution_round_trips_through_fv() -> None:
    target, current, rate, years = 50_000.0, 10_000.0, 0.06, 10
    contribution = retirement.required_contribution(target, current, rate, years)
    # Independent known-answer anchor (CFA derivation): effective monthly rate
    # 1.06^(1/12)-1; (50000 - 10000*1.06^10) / annuity_factor(120 months).
    assert contribution == pytest.approx(197.5186, rel=1e-5)
    # Growing today's savings plus the solved contributions must hit the target.
    reached = fv_lump_sum(current, rate, years) + fv_contributions(contribution, rate, years)
    assert reached == pytest.approx(target)


def test_required_contribution_is_zero_when_already_on_track() -> None:
    # Current savings alone already overshoot the target -> nothing more needed.
    contribution = retirement.required_contribution(50_000.0, 100_000.0, 0.06, 10)
    assert contribution == pytest.approx(0.0)
