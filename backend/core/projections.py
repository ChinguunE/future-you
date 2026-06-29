"""Growth projections (METHODOLOGY §2).

Turns a starting pot and a monthly saving habit into a future value — first the
single deterministic number, then an honest *range* via a seeded Monte-Carlo
cone, plus the sequence-of-returns effect that only bites once you withdraw.

Conventions
-----------
* Rates are annual decimals (``0.06`` = 6%/yr); contributions are monthly.
* Time steps monthly. The monthly rate ``i`` is the *effective* one, defined so
  ``(1 + i)^12 = 1 + annual`` — internally consistent with the annual figures
  the user sees.
* Contribution timing: ``"end"`` (ordinary annuity, the default) or ``"begin"``
  (annuity-due, one period earlier).
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np
from numpy.typing import ArrayLike, NDArray

__all__ = [
    "effective_monthly_rate",
    "fv_lump_sum",
    "fv_contributions",
    "simulate_paths",
    "projection_cone",
    "ConeResult",
    "terminal_value",
]

_MONTHS_PER_YEAR = 12


def _months(years: float) -> int:
    if years < 0:
        raise ValueError("years must be non-negative")
    return int(round(years * _MONTHS_PER_YEAR))


# --- Deterministic future value -------------------------------------------


def effective_monthly_rate(annual_rate: float) -> float:
    """The monthly rate ``i`` with ``(1 + i)^12 = 1 + annual_rate``.

    Using this (not ``annual / 12``) keeps monthly and annual figures
    internally consistent.
    """
    if annual_rate <= -1.0:
        raise ValueError("annual_rate must be greater than -100%")
    return float((1.0 + annual_rate) ** (1.0 / _MONTHS_PER_YEAR) - 1.0)


def fv_lump_sum(present_value: float, annual_rate: float, years: float) -> float:
    """Future value of one amount left to compound: ``PV·(1 + r)^n``."""
    if annual_rate <= -1.0:
        raise ValueError("annual_rate must be greater than -100%")
    return float(present_value * (1.0 + annual_rate) ** years)


def fv_contributions(
    monthly_contribution: float,
    annual_rate: float,
    years: float,
    *,
    timing: str = "end",
) -> float:
    """Future value of a regular monthly contribution stream.

    Ordinary annuity ``C · ((1 + i)^N − 1) / i`` at the effective monthly rate
    ``i``; annuity-due (``timing="begin"``) multiplies by ``(1 + i)`` because
    each payment compounds one extra month.
    """
    if timing not in ("end", "begin"):
        raise ValueError("timing must be 'end' or 'begin'")
    n = _months(years)
    i = effective_monthly_rate(annual_rate)
    if abs(i) < 1e-15:
        fv = monthly_contribution * n
    else:
        fv = monthly_contribution * ((1.0 + i) ** n - 1.0) / i
    if timing == "begin":
        fv *= 1.0 + i
    return float(fv)


# --- Seeded Monte-Carlo cone ----------------------------------------------


class ConeResult(NamedTuple):
    """A projection cone: the time axis, percentile bands, and raw endpoints."""

    months: NDArray[np.int_]
    bands: dict[str, NDArray[np.float64]]
    terminal: NDArray[np.float64]


def simulate_paths(
    initial: float,
    monthly_contribution: float,
    *,
    annual_mean: float,
    annual_vol: float,
    years: float,
    n_paths: int,
    seed: int,
) -> NDArray[np.float64]:
    """Simulate ``n_paths`` wealth paths over monthly steps.

    Monthly gross returns are lognormal: ``exp(μ + σ·z)`` with ``μ`` the log of
    the effective monthly mean and ``σ`` the monthly log-vol. With
    ``annual_vol = 0`` every draw collapses to the deterministic monthly rate,
    so the cone reproduces the closed-form FV exactly (a tested invariant). The
    result is shaped ``(n_paths, n_months + 1)`` including the starting value.
    """
    if n_paths < 1:
        raise ValueError("n_paths must be at least 1")
    if annual_vol < 0:
        raise ValueError("annual_vol must be non-negative")
    n = _months(years)

    mu_log = np.log1p(annual_mean) / _MONTHS_PER_YEAR
    sigma_log = annual_vol / np.sqrt(_MONTHS_PER_YEAR)

    rng = np.random.default_rng(seed)
    shocks = rng.standard_normal((n_paths, n))
    gross = np.exp(mu_log + sigma_log * shocks)

    out = np.empty((n_paths, n + 1), dtype=np.float64)
    out[:, 0] = initial
    value = np.full(n_paths, float(initial), dtype=np.float64)
    for m in range(n):
        value = value * gross[:, m] + monthly_contribution
        out[:, m + 1] = value
    return out


def projection_cone(
    initial: float,
    monthly_contribution: float,
    *,
    annual_mean: float,
    annual_vol: float,
    years: float,
    n_paths: int,
    seed: int,
    percentiles: tuple[int, ...] = (10, 50, 90),
) -> ConeResult:
    """Run the simulation and reduce it to percentile bands over time."""
    paths = simulate_paths(
        initial,
        monthly_contribution,
        annual_mean=annual_mean,
        annual_vol=annual_vol,
        years=years,
        n_paths=n_paths,
        seed=seed,
    )
    bands = {
        f"p{q}": np.asarray(np.percentile(paths, q, axis=0), dtype=np.float64)
        for q in percentiles
    }
    months = np.arange(paths.shape[1], dtype=np.int_)
    terminal = np.asarray(paths[:, -1], dtype=np.float64)
    return ConeResult(months=months, bands=bands, terminal=terminal)


# --- Sequence-of-returns risk ---------------------------------------------


def terminal_value(
    initial: float,
    returns: ArrayLike,
    *,
    cashflow: float = 0.0,
    timing: str = "end",
) -> float:
    """Terminal wealth after applying an *ordered* sequence of period returns.

    A constant ``cashflow`` is added each period (negative = a withdrawal).
    ``timing="start"`` applies the flow before that period's growth,
    ``"end"`` after. With ``cashflow=0`` the order is irrelevant (multiplication
    commutes); with withdrawals it is not — that gap is sequence-of-returns risk.
    """
    if timing not in ("start", "end"):
        raise ValueError("timing must be 'start' or 'end'")
    value = float(initial)
    for r in np.asarray(returns, dtype=np.float64):
        if timing == "start":
            value = (value + cashflow) * (1.0 + float(r))
        else:
            value = value * (1.0 + float(r)) + cashflow
    return value
