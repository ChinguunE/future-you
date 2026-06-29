"""Returns & risk statistics — the raw inputs every later module builds on
(METHODOLOGY §1).

Conventions
-----------
* A *return series* is a 1-D sequence of period returns as decimals
  (``0.05`` means +5%).
* A *returns matrix* is 2-D, shaped ``(periods, assets)``: each row is one
  period, each column one asset.
* Sample statistics use ``ddof=1`` by default — we estimate from a sample, so we
  divide by ``n - 1``. Pass ``ddof=0`` for the population value.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike, NDArray

from core._linalg import is_positive_semidefinite, nearest_psd

__all__ = [
    "arithmetic_mean",
    "geometric_mean",
    "variance",
    "volatility",
    "covariance_matrix",
    "correlation_matrix",
    "cov_to_corr",
    "corr_to_cov",
    "portfolio_variance",
    "portfolio_volatility",
    # Re-exported from _linalg so the risk-model tools live behind one import
    # (METHODOLOGY §1 lists PSD repair alongside the moments).
    "is_positive_semidefinite",
    "nearest_psd",
]


def _as_series(returns: ArrayLike) -> NDArray[np.float64]:
    series = np.asarray(returns, dtype=np.float64)
    if series.ndim != 1:
        raise ValueError("expected a 1-D return series")
    if series.size == 0:
        raise ValueError("return series is empty")
    return series


def _as_matrix(returns: ArrayLike) -> NDArray[np.float64]:
    matrix = np.asarray(returns, dtype=np.float64)
    if matrix.ndim != 2:
        raise ValueError("expected a 2-D (periods, assets) returns matrix")
    if matrix.shape[0] < 2:
        raise ValueError("need at least 2 periods to estimate (co)variance")
    return matrix


# --- Mean -----------------------------------------------------------------


def arithmetic_mean(returns: ArrayLike) -> float:
    """Simple average return. Overstates the actual compounded experience."""
    return float(np.mean(_as_series(returns)))


def geometric_mean(returns: ArrayLike) -> float:
    """The constant per-period rate that reproduces the real compounding.

    ``(∏(1 + rₜ))^(1/n) − 1`` — the return you actually lived. Computed via logs
    for numerical stability. Equals the arithmetic mean only when every period
    is identical; otherwise it is strictly lower.
    """
    series = _as_series(returns)
    growth = 1.0 + series
    if np.any(growth <= 0.0):
        raise ValueError("a period return <= -100% makes the geometric mean undefined")
    return float(np.exp(np.mean(np.log(growth))) - 1.0)


# --- Dispersion -----------------------------------------------------------


def variance(returns: ArrayLike, *, ddof: int = 1) -> float:
    """Average squared deviation from the mean — how bumpy the ride is."""
    series = _as_series(returns)
    if series.size <= ddof:
        raise ValueError("not enough observations for the requested ddof")
    return float(np.var(series, ddof=ddof))


def volatility(returns: ArrayLike, *, ddof: int = 1) -> float:
    """Standard deviation of returns (the square root of variance)."""
    return float(np.sqrt(variance(returns, ddof=ddof)))


# --- Co-movement (the engine of diversification) --------------------------


def covariance_matrix(returns: ArrayLike, *, ddof: int = 1) -> NDArray[np.float64]:
    """Asset-by-asset covariance from a ``(periods, assets)`` matrix.

    Symmetric; the diagonal is each asset's own variance.
    """
    matrix = _as_matrix(returns)
    cov = np.cov(matrix, rowvar=False, ddof=ddof)
    return np.asarray(np.atleast_2d(cov), dtype=np.float64)


def cov_to_corr(cov: ArrayLike) -> NDArray[np.float64]:
    """Strip the scale out of a covariance matrix, leaving pure correlation."""
    c = np.asarray(cov, dtype=np.float64)
    if c.ndim != 2 or c.shape[0] != c.shape[1]:
        raise ValueError("covariance matrix must be square")
    vols = np.sqrt(np.diag(c))
    if np.any(vols <= 0.0):
        raise ValueError("a zero-variance asset has no defined correlation")
    corr = c / np.outer(vols, vols)
    np.fill_diagonal(corr, 1.0)
    return np.asarray(corr, dtype=np.float64)


def correlation_matrix(returns: ArrayLike, *, ddof: int = 1) -> NDArray[np.float64]:
    """Correlation (-1..1) between each pair of assets; diagonal is 1."""
    return cov_to_corr(covariance_matrix(returns, ddof=ddof))


def corr_to_cov(corr: ArrayLike, vols: ArrayLike) -> NDArray[np.float64]:
    """Rebuild a covariance matrix from a correlation matrix and a vol vector.

    Lets us pair a stable correlation estimate with separate volatility
    assumptions (used when blending capital-market assumptions).
    """
    corr_m = np.asarray(corr, dtype=np.float64)
    vol_v = np.asarray(vols, dtype=np.float64)
    if corr_m.ndim != 2 or corr_m.shape[0] != corr_m.shape[1]:
        raise ValueError("correlation matrix must be square")
    if vol_v.ndim != 1 or vol_v.size != corr_m.shape[0]:
        raise ValueError("vols length must match the correlation matrix size")
    return np.asarray(corr_m * np.outer(vol_v, vol_v), dtype=np.float64)


# --- Portfolio-level risk -------------------------------------------------


def portfolio_variance(weights: ArrayLike, cov: ArrayLike) -> float:
    """``w'Σw`` — the variance of a weighted portfolio."""
    w = np.asarray(weights, dtype=np.float64)
    c = np.asarray(cov, dtype=np.float64)
    if w.ndim != 1:
        raise ValueError("weights must be 1-D")
    if c.shape != (w.size, w.size):
        raise ValueError("cov shape must match the number of weights")
    return float(w @ c @ w)


def portfolio_volatility(weights: ArrayLike, cov: ArrayLike) -> float:
    """Standard deviation of a weighted portfolio (``√(w'Σw)``)."""
    return float(np.sqrt(portfolio_variance(weights, cov)))
