"""Known-answer tests for `core.analytics` (METHODOLOGY §3).

Risk-adjusted analytics: Sharpe, Sortino (downside deviation), parametric and
historical VaR, conditional VaR (expected shortfall), maximum drawdown, and
risk budgeting (marginal / component contributions, diversification ratio).
"""

import numpy as np
import pytest

from core import analytics, moments

# --- Sharpe ----------------------------------------------------------------


def test_sharpe_ratio_known() -> None:
    # (0.10 - 0.02) / 0.16 = 0.5 — return per unit of total risk.
    assert analytics.sharpe_ratio(0.10, 0.16, risk_free=0.02) == pytest.approx(0.5)


# --- Sortino / downside deviation -----------------------------------------


def test_downside_deviation_known() -> None:
    # Only the below-target returns count; squared and averaged over ALL N:
    #   [(0)^2 + (-0.10)^2 + (0)^2 + (-0.10)^2] / 4 = 0.005 -> sqrt = 0.0707...
    series = [0.30, -0.10, 0.20, -0.10]
    assert analytics.downside_deviation(series, target=0.0) == pytest.approx(np.sqrt(0.005))


def test_sortino_ratio_known() -> None:
    # mean 0.075, downside deviation sqrt(0.005).
    series = [0.30, -0.10, 0.20, -0.10]
    assert analytics.sortino_ratio(series, target=0.0) == pytest.approx(0.075 / np.sqrt(0.005))


# --- Value-at-Risk (parametric) -------------------------------------------


def test_parametric_var_known_gaussian() -> None:
    # Gaussian VaR95 with mean 0, vol 0.10: 1.6448536 * 0.10 = 0.16448536.
    var = analytics.parametric_var(0.0, 0.10, confidence=0.95)
    assert var == pytest.approx(0.16448536269514715)


def test_parametric_cvar_matches_simulation_and_exceeds_var() -> None:
    var = analytics.parametric_var(0.0, 0.10, confidence=0.95)
    cvar = analytics.parametric_cvar(0.0, 0.10, confidence=0.95)
    # Expected shortfall sits deeper in the tail than VaR.
    assert cvar >= var
    # Independent cross-check: the empirical expected shortfall of a large
    # Gaussian sample should match the closed-form figure (different method).
    rng = np.random.default_rng(0)
    sample = rng.normal(0.0, 0.10, size=1_000_000)
    tail = sample[sample <= np.quantile(sample, 0.05)]
    assert cvar == pytest.approx(float(-tail.mean()), rel=0.01)


# --- Value-at-Risk (historical) -------------------------------------------


def test_historical_var_matches_the_quantile_and_cvar_is_deeper() -> None:
    rng = np.random.default_rng(0)
    sample = rng.normal(0.0, 0.1, size=10_000)
    var = analytics.historical_var(sample, confidence=0.95)
    cvar = analytics.historical_cvar(sample, confidence=0.95)
    # VaR is just the (1 - confidence) quantile loss, by definition.
    assert var == pytest.approx(-np.quantile(sample, 0.05))
    # The tail average is always at least as bad as the cutoff.
    assert cvar >= var


# --- Maximum drawdown ------------------------------------------------------


def test_max_drawdown_known_path() -> None:
    # Peak 120, trough 80 -> (120 - 80) / 120 = 1/3 is the worst fall.
    values = [100.0, 120.0, 90.0, 110.0, 80.0, 130.0]
    assert analytics.max_drawdown(values) == pytest.approx(1.0 / 3.0)


def test_max_drawdown_is_zero_for_a_monotonic_climb() -> None:
    assert analytics.max_drawdown([100.0, 101.0, 102.0]) == pytest.approx(0.0)


# --- Risk budgeting --------------------------------------------------------


def test_component_risk_contributions_sum_to_total_volatility() -> None:
    cov = np.array([[0.04, 0.02], [0.02, 0.04]])
    weights = np.array([0.5, 0.5])
    ccr = analytics.risk_contributions(weights, cov)
    total_vol = moments.portfolio_volatility(weights, cov)
    # The defining property: component contributions add up to portfolio vol.
    assert np.sum(ccr) == pytest.approx(total_vol)
    # Symmetric inputs -> each name carries exactly half the risk.
    assert np.allclose(ccr, np.sqrt(0.03) / 2.0)


def test_percent_risk_contributions_sum_to_one() -> None:
    cov = np.array([[0.04, 0.02], [0.02, 0.04]])
    weights = np.array([0.5, 0.5])
    pcr = analytics.percent_risk_contributions(weights, cov)
    assert np.sum(pcr) == pytest.approx(1.0)


def test_diversification_ratio() -> None:
    weights = np.array([0.5, 0.5])
    # Diversified (corr 0.5): weighted-avg vol 0.2 vs portfolio vol sqrt(0.03) > 1.
    diversified = analytics.diversification_ratio(weights, np.array([[0.04, 0.02], [0.02, 0.04]]))
    assert diversified == pytest.approx(0.2 / np.sqrt(0.03))
    assert diversified > 1.0
    # Perfectly correlated: no diversification benefit -> ratio exactly 1.
    correlated = analytics.diversification_ratio(weights, np.array([[0.04, 0.04], [0.04, 0.04]]))
    assert correlated == pytest.approx(1.0)
