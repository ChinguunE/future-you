"""Risk-adjusted analytics (METHODOLOGY §3).

How good a return is *given the risk taken*, how bad a rough patch can get, and
which holdings actually drive the wobble. Ratios take summary statistics or a
return series; the tail and drawdown measures take the series or value path;
risk budgeting takes weights and a covariance matrix.

Conventions: returns are per-period decimals; ``confidence`` is the VaR level
(0.95 = "a bad 1-in-20 period"); losses are reported as positive numbers.
"""

from __future__ import annotations

from statistics import NormalDist

import numpy as np
from numpy.typing import ArrayLike, NDArray

from core.moments import portfolio_volatility

__all__ = [
    "sharpe_ratio",
    "downside_deviation",
    "sortino_ratio",
    "parametric_var",
    "parametric_cvar",
    "historical_var",
    "historical_cvar",
    "max_drawdown",
    "marginal_risk_contributions",
    "risk_contributions",
    "percent_risk_contributions",
    "diversification_ratio",
]

_STANDARD_NORMAL = NormalDist()


def _as_series(returns: ArrayLike) -> NDArray[np.float64]:
    series = np.asarray(returns, dtype=np.float64)
    if series.ndim != 1 or series.size == 0:
        raise ValueError("expected a non-empty 1-D return series")
    return series


# --- Risk-adjusted return ratios ------------------------------------------


def sharpe_ratio(mean_return: float, volatility: float, *, risk_free: float = 0.0) -> float:
    """Excess return per unit of *total* risk: ``(Rp − Rf) / σ``."""
    if volatility <= 0.0:
        raise ValueError("volatility must be positive")
    return float((mean_return - risk_free) / volatility)


def downside_deviation(returns: ArrayLike, *, target: float = 0.0) -> float:
    """Root-mean-square of the shortfalls below ``target`` (averaged over all N).

    Only returns under the target are penalised — the risk investors actually
    fear. Upside volatility is treated as harmless.
    """
    series = _as_series(returns)
    shortfall = np.minimum(series - target, 0.0)
    return float(np.sqrt(np.mean(shortfall**2)))


def sortino_ratio(returns: ArrayLike, *, target: float = 0.0) -> float:
    """Excess return per unit of *downside* risk: ``(mean − target) / DD``."""
    dd = downside_deviation(returns, target=target)
    if dd <= 0.0:
        raise ValueError("no downside risk against the target; Sortino is undefined")
    return float((float(np.mean(_as_series(returns))) - target) / dd)


# --- Tail risk -------------------------------------------------------------


def _alpha(confidence: float) -> float:
    if not 0.0 < confidence < 1.0:
        raise ValueError("confidence must be strictly between 0 and 1")
    return 1.0 - confidence


def parametric_var(mean: float, volatility: float, *, confidence: float = 0.95) -> float:
    """Gaussian Value-at-Risk: the loss a bad period of this size implies.

    ``−(μ + z_α·σ)`` with ``z_α`` the lower-tail normal quantile; returned as a
    positive loss. With μ = 0 this is the familiar ``1.645·σ`` at 95%.
    """
    if volatility < 0.0:
        raise ValueError("volatility must be non-negative")
    z = _STANDARD_NORMAL.inv_cdf(_alpha(confidence))
    return float(-(mean + z * volatility))


def parametric_cvar(mean: float, volatility: float, *, confidence: float = 0.95) -> float:
    """Gaussian conditional VaR (expected shortfall) — the *average* tail loss.

    ``−μ + σ·φ(z_α)/α`` — more honest than VaR because it accounts for how bad
    the bad cases are, not just where they begin. Always ≥ the matching VaR.
    """
    if volatility < 0.0:
        raise ValueError("volatility must be non-negative")
    alpha = _alpha(confidence)
    z = _STANDARD_NORMAL.inv_cdf(alpha)
    return float(-mean + volatility * _STANDARD_NORMAL.pdf(z) / alpha)


def historical_var(returns: ArrayLike, *, confidence: float = 0.95) -> float:
    """Empirical VaR: the loss at the ``(1 − confidence)`` quantile of the data."""
    series = _as_series(returns)
    return float(-np.quantile(series, _alpha(confidence)))


def historical_cvar(returns: ArrayLike, *, confidence: float = 0.95) -> float:
    """Empirical expected shortfall: the average loss in the worst-case tail."""
    series = _as_series(returns)
    threshold = np.quantile(series, _alpha(confidence))
    tail = series[series <= threshold]
    if tail.size == 0:
        return float(-threshold)
    return float(-tail.mean())


def max_drawdown(values: ArrayLike) -> float:
    """Worst peak-to-trough fall along a value path, as a positive fraction."""
    path = _as_series(values)
    if np.any(path <= 0.0):
        raise ValueError("value path must be strictly positive")
    running_peak = np.maximum.accumulate(path)
    drawdowns = (running_peak - path) / running_peak
    return float(drawdowns.max())


# --- Risk budgeting --------------------------------------------------------


def _weights_and_cov(
    weights: ArrayLike, cov: ArrayLike
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    w = np.asarray(weights, dtype=np.float64)
    c = np.asarray(cov, dtype=np.float64)
    if w.ndim != 1:
        raise ValueError("weights must be 1-D")
    if c.shape != (w.size, w.size):
        raise ValueError("cov shape must match the number of weights")
    return w, c


def marginal_risk_contributions(weights: ArrayLike, cov: ArrayLike) -> NDArray[np.float64]:
    """∂σ_p/∂w_i = (Σw)_i / σ_p — how much each name moves portfolio risk."""
    w, c = _weights_and_cov(weights, cov)
    sigma_p = portfolio_volatility(w, c)
    if sigma_p <= 0.0:
        raise ValueError("portfolio volatility must be positive")
    return np.asarray((c @ w) / sigma_p, dtype=np.float64)


def risk_contributions(weights: ArrayLike, cov: ArrayLike) -> NDArray[np.float64]:
    """Component risk contribution ``w_i · MCR_i``; these sum to portfolio vol."""
    w, c = _weights_and_cov(weights, cov)
    return np.asarray(w * marginal_risk_contributions(w, c), dtype=np.float64)


def percent_risk_contributions(weights: ArrayLike, cov: ArrayLike) -> NDArray[np.float64]:
    """Each name's share of total risk; sums to 1."""
    w, c = _weights_and_cov(weights, cov)
    ccr = risk_contributions(w, c)
    return np.asarray(ccr / np.sum(ccr), dtype=np.float64)


def diversification_ratio(weights: ArrayLike, cov: ArrayLike) -> float:
    """Weighted-average asset vol ÷ portfolio vol — how much diversification helps.

    1.0 means none (perfect correlation); higher means the mix dampens risk.
    """
    w, c = _weights_and_cov(weights, cov)
    weighted_avg_vol = float(w @ np.sqrt(np.diag(c)))
    sigma_p = portfolio_volatility(w, c)
    if sigma_p <= 0.0:
        raise ValueError("portfolio volatility must be positive")
    return weighted_avg_vol / sigma_p
