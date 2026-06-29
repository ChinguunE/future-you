"""Mean-variance optimisation (METHODOLOGY §4).

The efficient frontier (the best return obtainable at each level of risk), the
closed-form tangency portfolio, and the long-only max-Sharpe mix that the plan
anchors on. Long-only and fully-invested (``Σw = 1``, ``w ≥ 0``) via SLSQP, with
the closed-form tangency kept for the capital-market line.

> Estimation-error note (METHODOLOGY §4): raw MVO is sensitive to its inputs,
> so the product anchors on rule-based allocation and treats this as a sanity
> check / teaching surface, not a black-box weight generator.
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np
from numpy.typing import ArrayLike, NDArray
from scipy.optimize import minimize

from core.moments import portfolio_volatility

__all__ = [
    "FrontierResult",
    "min_variance_portfolio",
    "max_sharpe_portfolio",
    "tangency_weights",
    "efficient_frontier",
    "capital_market_line",
]

_SLSQP_OPTIONS = {"maxiter": 1000, "ftol": 1e-12}


class FrontierResult(NamedTuple):
    """A sampled efficient frontier: risk, return, and weights per point."""

    risks: NDArray[np.float64]
    returns: NDArray[np.float64]
    weights: NDArray[np.float64]


def _check_inputs(mu: ArrayLike, cov: ArrayLike) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    m = np.asarray(mu, dtype=np.float64)
    c = np.asarray(cov, dtype=np.float64)
    if m.ndim != 1:
        raise ValueError("mu must be 1-D")
    if c.shape != (m.size, m.size):
        raise ValueError("cov shape must match the length of mu")
    return m, c


def _normalise(weights: NDArray[np.float64]) -> NDArray[np.float64]:
    """Clip optimiser dust below zero and renormalise to sum exactly to 1."""
    clipped = np.clip(weights, 0.0, None)
    total = clipped.sum()
    if total <= 0.0:
        raise ValueError("degenerate solution: weights do not sum to a positive number")
    return np.asarray(clipped / total, dtype=np.float64)


def _min_variance_weights(
    mu: NDArray[np.float64], cov: NDArray[np.float64], target: float | None
) -> NDArray[np.float64]:
    n = mu.size
    constraints: list[dict[str, object]] = [{"type": "eq", "fun": lambda w: float(np.sum(w) - 1.0)}]
    if target is not None:
        t = target
        constraints.append({"type": "eq", "fun": lambda w: float(w @ mu - t)})
    bounds = [(0.0, 1.0)] * n
    w0 = np.full(n, 1.0 / n)
    result = minimize(
        lambda w: float(w @ cov @ w),
        w0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options=_SLSQP_OPTIONS,
    )
    if not result.success:
        raise ValueError(f"min-variance optimisation failed: {result.message}")
    return _normalise(np.asarray(result.x, dtype=np.float64))


def min_variance_portfolio(mu: ArrayLike, cov: ArrayLike) -> NDArray[np.float64]:
    """Global minimum-variance portfolio (long-only) — the calmest possible mix."""
    m, c = _check_inputs(mu, cov)
    return _min_variance_weights(m, c, None)


def max_sharpe_portfolio(
    mu: ArrayLike, cov: ArrayLike, *, risk_free: float = 0.0
) -> NDArray[np.float64]:
    """Long-only mix with the highest Sharpe ratio (the best risk-adjusted bet)."""
    m, c = _check_inputs(mu, cov)
    n = m.size

    def neg_sharpe(w: NDArray[np.float64]) -> float:
        variance = float(w @ c @ w)
        if variance <= 0.0:
            return 1e6
        return -float((w @ m - risk_free) / np.sqrt(variance))

    constraints: list[dict[str, object]] = [{"type": "eq", "fun": lambda w: float(np.sum(w) - 1.0)}]
    result = minimize(
        neg_sharpe,
        np.full(n, 1.0 / n),
        method="SLSQP",
        bounds=[(0.0, 1.0)] * n,
        constraints=constraints,
        options=_SLSQP_OPTIONS,
    )
    if not result.success:
        raise ValueError(f"max-Sharpe optimisation failed: {result.message}")
    return _normalise(np.asarray(result.x, dtype=np.float64))


def tangency_weights(
    mu: ArrayLike, cov: ArrayLike, *, risk_free: float = 0.0
) -> NDArray[np.float64]:
    """Closed-form tangency portfolio ``Σ⁻¹(μ − rf) / Σ Σ⁻¹(μ − rf)``.

    Unconstrained (may imply shorting); used to anchor the capital-market line.
    """
    m, c = _check_inputs(mu, cov)
    raw = np.linalg.solve(c, m - risk_free)
    total = raw.sum()
    if total == 0.0:
        raise ValueError("tangency portfolio is undefined for these inputs")
    return np.asarray(raw / total, dtype=np.float64)


def efficient_frontier(mu: ArrayLike, cov: ArrayLike, *, n_points: int = 25) -> FrontierResult:
    """Sweep target returns from the min-variance point up to the best asset."""
    if n_points < 2:
        raise ValueError("n_points must be at least 2")
    m, c = _check_inputs(mu, cov)
    gmv = _min_variance_weights(m, c, None)
    targets = np.linspace(float(gmv @ m), float(m.max()), n_points)
    weights = np.array([_min_variance_weights(m, c, float(t)) for t in targets])
    risks = np.array([portfolio_volatility(w, c) for w in weights])
    returns = weights @ m
    return FrontierResult(
        risks=np.asarray(risks, dtype=np.float64),
        returns=np.asarray(returns, dtype=np.float64),
        weights=np.asarray(weights, dtype=np.float64),
    )


def capital_market_line(
    risks: ArrayLike,
    *,
    risk_free: float,
    tangency_return: float,
    tangency_risk: float,
) -> NDArray[np.float64]:
    """The risk/return line from cash through the tangency portfolio.

    ``return = rf + (Sharpe of tangency)·risk`` — what you can reach by mixing
    cash with the best risk-adjusted portfolio.
    """
    if tangency_risk <= 0.0:
        raise ValueError("tangency_risk must be positive")
    slope = (tangency_return - risk_free) / tangency_risk
    return np.asarray(risk_free + slope * np.asarray(risks, dtype=np.float64), dtype=np.float64)
