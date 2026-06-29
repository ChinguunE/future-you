"""Known-answer tests for `core.projections` (METHODOLOGY §2).

Growth projections: future value of a lump sum and of regular contributions
(with an internally-consistent effective-monthly rate), a *seeded* Monte-Carlo
cone (reproducible), and sequence-of-returns risk (order matters once you draw
money out).
"""

import numpy as np
import pytest

from core import projections

# --- Future value of a lump sum -------------------------------------------


def test_fv_lump_sum_known() -> None:
    # 100 * 1.10^3 = 100 * 1.331 = 133.1
    assert projections.fv_lump_sum(100.0, 0.10, 3) == pytest.approx(133.1)


# --- Effective monthly rate (internally consistent) -----------------------


def test_effective_monthly_rate_compounds_back_to_annual() -> None:
    # The whole point: 12 effective-monthly steps must equal one annual step.
    rate = projections.effective_monthly_rate(0.06)
    assert (1.0 + rate) ** 12 == pytest.approx(1.06)


def test_effective_monthly_rate_recovers_a_clean_monthly_rate() -> None:
    # If the annual rate IS (1.005^12 - 1), the monthly rate must be 0.5%.
    annual = 1.005**12 - 1.0
    assert projections.effective_monthly_rate(annual) == pytest.approx(0.005)


# --- Future value of regular contributions --------------------------------


def test_fv_contributions_zero_rate_is_just_the_sum() -> None:
    # 100/month for 10 years at 0% = 120 * 100 = 12000.
    assert projections.fv_contributions(100.0, 0.0, 10) == pytest.approx(12000.0)


def test_fv_contributions_known_hand_computed() -> None:
    # 3 monthly contributions of 1000 at an effective 0.5%/month, paid at the
    # END of each month (ordinary annuity):
    #   1000*1.005^2 + 1000*1.005^1 + 1000 = 1010.025 + 1005.0 + 1000 = 3015.025
    annual = 1.005**12 - 1.0
    assert projections.fv_contributions(1000.0, annual, 0.25) == pytest.approx(3015.025)


def test_fv_contributions_begin_timing_is_one_period_earlier() -> None:
    # Annuity-due (paid at the START of each month) earns one extra month:
    #   3015.025 * 1.005 = 3030.100125
    annual = 1.005**12 - 1.0
    ordinary = projections.fv_contributions(1000.0, annual, 0.25)
    due = projections.fv_contributions(1000.0, annual, 0.25, timing="begin")
    assert due == pytest.approx(ordinary * 1.005)
    assert due == pytest.approx(3030.100125)


# --- Seeded Monte-Carlo cone ----------------------------------------------


def test_simulate_paths_is_reproducible_with_a_seed() -> None:
    kwargs = dict(annual_mean=0.06, annual_vol=0.15, years=5, n_paths=500)
    a = projections.simulate_paths(1000.0, 100.0, **kwargs, seed=42)
    b = projections.simulate_paths(1000.0, 100.0, **kwargs, seed=42)
    c = projections.simulate_paths(1000.0, 100.0, **kwargs, seed=7)
    assert np.array_equal(a, b)  # same seed -> identical
    assert not np.array_equal(a, c)  # different seed -> different
    assert a.shape == (500, 5 * 12 + 1)


def test_simulate_paths_zero_vol_equals_the_deterministic_projection() -> None:
    # With no randomness, every path must collapse onto the closed-form FV:
    # lump-sum growth + contribution growth.
    paths = projections.simulate_paths(
        1000.0, 100.0, annual_mean=0.06, annual_vol=0.0, years=5, n_paths=50, seed=1
    )
    expected_terminal = projections.fv_lump_sum(1000.0, 0.06, 5) + projections.fv_contributions(
        100.0, 0.06, 5
    )
    terminal = paths[:, -1]
    assert np.std(terminal) == pytest.approx(0.0, abs=1e-9)  # no spread
    assert terminal[0] == pytest.approx(expected_terminal)


def test_projection_cone_bands_are_ordered() -> None:
    cone = projections.projection_cone(
        1000.0, 100.0, annual_mean=0.06, annual_vol=0.15, years=5, n_paths=2000, seed=123
    )
    assert len(cone.months) == 5 * 12 + 1
    assert cone.bands["p50"][0] == pytest.approx(1000.0)  # t=0 is the starting value
    # At every horizon the percentiles must be ordered low <= mid <= high.
    assert np.all(cone.bands["p10"] <= cone.bands["p50"] + 1e-9)
    assert np.all(cone.bands["p50"] <= cone.bands["p90"] + 1e-9)


# --- Sequence-of-returns risk ---------------------------------------------


def test_sequence_of_returns_order_matters_only_with_withdrawals() -> None:
    initial = 100.0
    good_first = [0.20, -0.20]
    bad_first = [-0.20, 0.20]

    # Accumulation (no cash flow): order does NOT matter (100*0.8*1.2 = 96 both ways).
    acc_good = projections.terminal_value(initial, good_first)
    acc_bad = projections.terminal_value(initial, bad_first)
    assert acc_good == pytest.approx(96.0)
    assert acc_bad == pytest.approx(96.0)

    # Withdrawing 10 at the start of each year: a bad early year hurts far more.
    #   bad-first:  (100-10)*0.8 = 72 -> (72-10)*1.2 = 74.4
    #   good-first: (100-10)*1.2 = 108 -> (108-10)*0.8 = 78.4
    bad_early = projections.terminal_value(initial, bad_first, cashflow=-10.0, timing="start")
    bad_late = projections.terminal_value(initial, good_first, cashflow=-10.0, timing="start")
    assert bad_early == pytest.approx(74.4)
    assert bad_late == pytest.approx(78.4)
    assert bad_early < bad_late  # the sequence-of-returns lesson
