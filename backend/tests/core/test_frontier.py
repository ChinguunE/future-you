"""Known-answer and invariant tests for `core.frontier` (METHODOLOGY §4).

The efficient frontier (best return for each level of risk), the closed-form
tangency portfolio, and the long-only max-Sharpe mix. Most checks are
*invariants* — properties any correct optimiser must satisfy — anchored by one
hand-computable closed-form case.
"""

import numpy as np
import pytest
from numpy.typing import NDArray

from core import analytics, frontier, moments


def _sample_long_only(n: int, k: int, seed: int) -> NDArray[np.float64]:
    """k random long-only, fully-invested weight vectors over n assets."""
    rng = np.random.default_rng(seed)
    return rng.dirichlet(np.ones(n), size=k)


# --- Closed-form tangency (the hand-computable anchor) ---------------------


def test_tangency_weights_known_closed_form() -> None:
    # Uncorrelated assets, rf = 0: weight is proportional to excess / variance.
    #   asset A: 0.10 / 0.04 = 2.5 ; asset B: 0.05 / 0.01 = 5.0
    #   normalise [2.5, 5.0] -> [1/3, 2/3]
    mu = np.array([0.10, 0.05])
    cov = np.array([[0.04, 0.0], [0.0, 0.01]])
    weights = frontier.tangency_weights(mu, cov, risk_free=0.0)
    assert weights == pytest.approx([1 / 3, 2 / 3])


# --- Global minimum-variance portfolio ------------------------------------


def test_min_variance_portfolio_has_the_lowest_variance(
    market: tuple[NDArray[np.float64], NDArray[np.float64]],
) -> None:
    mu, cov = market
    gmv = frontier.min_variance_portfolio(mu, cov)
    assert np.sum(gmv) == pytest.approx(1.0)
    assert np.all(gmv >= -1e-9)  # long-only
    gmv_var = moments.portfolio_variance(gmv, cov)
    # No randomly sampled long-only portfolio may beat it.
    for w in _sample_long_only(3, 400, seed=1):
        assert gmv_var <= moments.portfolio_variance(w, cov) + 1e-9


# --- Max-Sharpe (long-only) -----------------------------------------------


def test_max_sharpe_beats_every_sampled_portfolio(
    market: tuple[NDArray[np.float64], NDArray[np.float64]],
) -> None:
    mu, cov = market
    rf = 0.01
    best = frontier.max_sharpe_portfolio(mu, cov, risk_free=rf)
    assert np.sum(best) == pytest.approx(1.0)
    assert np.all(best >= -1e-9)

    def sharpe(w: NDArray[np.float64]) -> float:
        return analytics.sharpe_ratio(
            float(w @ mu), moments.portfolio_volatility(w, cov), risk_free=rf
        )

    best_sharpe = sharpe(best)
    for w in _sample_long_only(3, 400, seed=2):
        assert best_sharpe >= sharpe(w) - 1e-9


def test_max_sharpe_matches_closed_form_when_interior() -> None:
    # When the unconstrained tangency is already long-only, the constrained
    # optimiser must land on the same point.
    mu = np.array([0.10, 0.05])
    cov = np.array([[0.04, 0.0], [0.0, 0.01]])
    constrained = frontier.max_sharpe_portfolio(mu, cov, risk_free=0.0)
    assert constrained == pytest.approx([1 / 3, 2 / 3], abs=1e-4)


# --- The efficient frontier -----------------------------------------------


def test_efficient_frontier_is_convex_and_valid(
    market: tuple[NDArray[np.float64], NDArray[np.float64]],
) -> None:
    mu, cov = market
    curve = frontier.efficient_frontier(mu, cov, n_points=20)
    # Each point is a valid long-only, fully-invested portfolio.
    assert np.allclose(curve.weights.sum(axis=1), 1.0)
    assert np.all(curve.weights >= -1e-8)
    # Higher target return demands higher risk (monotonic upper frontier).
    assert np.all(np.diff(curve.returns) > 0)
    assert np.all(np.diff(curve.risks) > -1e-9)
    # Risk is a convex function of return: the frontier bulges to the left.
    assert np.all(np.diff(curve.risks, 2) >= -1e-6)


# --- Capital market line ---------------------------------------------------


def test_capital_market_line_passes_through_rf_and_tangency() -> None:
    mu = np.array([0.10, 0.05])
    cov = np.array([[0.04, 0.0], [0.0, 0.01]])
    rf = 0.01
    tangency = frontier.tangency_weights(mu, cov, risk_free=rf)
    t_return = float(tangency @ mu)
    t_risk = moments.portfolio_volatility(tangency, cov)
    risks = np.array([0.0, t_risk])
    line = frontier.capital_market_line(
        risks, risk_free=rf, tangency_return=t_return, tangency_risk=t_risk
    )
    assert line[0] == pytest.approx(rf)  # at zero risk you earn the risk-free rate
    assert line[1] == pytest.approx(t_return)  # the line touches the tangency portfolio
