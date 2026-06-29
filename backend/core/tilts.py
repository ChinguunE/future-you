"""Investor views & tilts — "your picks at an adjusted weight" (METHODOLOGY §5).

THE centerpiece. The optimised core does ~90% of the work; this module lets the
user tilt it toward names they actually want (the NVIDIA flow) **without**
letting that become gambling. It blends the picks onto the core (Black-Litterman
*in spirit* — a confidence-weighted move toward a view), sizes each pick by its
own risk (a riskier pick earns a smaller responsible weight), and enforces hard
guardrails: a per-name cap, a per-sleeve satellite cap, and a preserved
diversified core. It also reports the trade-off versus the untilted optimal mix.

Everything here is pure and bounded — the caps are what make "include what you
want" safe.
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np
from numpy.typing import ArrayLike, NDArray

from core.analytics import sharpe_ratio
from core.moments import portfolio_volatility

__all__ = [
    "risk_adjusted_cap",
    "blend_views",
    "tilt_cost",
    "TiltResult",
    "TiltCost",
]


class TiltResult(NamedTuple):
    """The blended portfolio over ``[core..., picks...]`` and its guardrails."""

    optimal_weights: NDArray[np.float64]  # pre-tilt: core weights, picks at 0
    tilted_weights: NDArray[np.float64]  # post-tilt, sums to 1
    caps: NDArray[np.float64]  # the upper bound each position respects
    delta: NDArray[np.float64]  # tilted - optimal (the weight-space trade-off)
    core_weight: float  # total in the diversified core
    satellite_weight: float  # total in the user's picks


class TiltCost(NamedTuple):
    """Optimal-vs-your-mix in value space — the cost (or benefit) of the tilt."""

    optimal_return: float
    tilted_return: float
    optimal_risk: float
    tilted_risk: float
    optimal_sharpe: float
    tilted_sharpe: float


def risk_adjusted_cap(
    risk: float, *, reference_risk: float, base_cap: float, hard_cap: float
) -> float:
    """The largest responsible weight a single pick may hold.

    A pick of "reference" risk earns ``base_cap``; a riskier pick earns less, in
    inverse proportion to its risk; and nothing may ever exceed ``hard_cap``::

        cap = min(hard_cap, base_cap · reference_risk / risk)
    """
    if risk <= 0.0:
        raise ValueError("risk must be positive")
    if reference_risk <= 0.0 or base_cap < 0.0 or hard_cap < 0.0:
        raise ValueError("reference_risk must be positive and caps non-negative")
    if base_cap > hard_cap:
        raise ValueError("base_cap cannot exceed hard_cap")
    return float(min(hard_cap, base_cap * reference_risk / risk))


def blend_views(
    core_weights: ArrayLike,
    pick_risks: ArrayLike,
    *,
    reference_risk: float,
    base_cap: float,
    hard_cap: float,
    satellite_cap: float,
    tilt_strength: float = 1.0,
) -> TiltResult:
    """Blend the user's picks onto the optimised core, sized by risk and capped.

    ``core_weights`` is the optimal core (sums to 1); ``pick_risks`` is the
    volatility of each requested name. Each pick targets
    ``tilt_strength · risk_adjusted_cap(risk)``; if the picks together exceed the
    ``satellite_cap`` they are scaled down proportionally, and the core is
    shrunk pro-rata to make room — so the diversified core never drops below
    ``1 − satellite_cap``.
    """
    core = np.asarray(core_weights, dtype=np.float64)
    risks = np.asarray(pick_risks, dtype=np.float64)
    if core.ndim != 1 or core.size == 0:
        raise ValueError("core_weights must be a non-empty 1-D vector")
    if not np.isclose(core.sum(), 1.0) or np.any(core < -1e-12):
        raise ValueError("core_weights must be non-negative and sum to 1")
    if risks.ndim != 1:
        raise ValueError("pick_risks must be 1-D")
    if not 0.0 <= satellite_cap < 1.0:
        raise ValueError("satellite_cap must be in [0, 1)")
    if not 0.0 <= tilt_strength <= 1.0:
        raise ValueError("tilt_strength must be in [0, 1]")

    pick_caps = np.array(
        [
            risk_adjusted_cap(
                r, reference_risk=reference_risk, base_cap=base_cap, hard_cap=hard_cap
            )
            for r in risks
        ]
    )
    desired = tilt_strength * pick_caps
    total_desired = float(desired.sum())
    if total_desired > satellite_cap:
        # Greedy picks: scale them back so the satellite sleeve cap binds.
        pick_weights = desired * (satellite_cap / total_desired)
    else:
        pick_weights = desired
    satellite_weight = float(pick_weights.sum())
    core_total = 1.0 - satellite_weight
    core_scaled = core * core_total

    tilted = np.concatenate([core_scaled, pick_weights])
    optimal = np.concatenate([core, np.zeros_like(pick_weights)])
    # The core can only shrink, so its optimal weight is its own upper bound.
    caps = np.concatenate([core, pick_caps])
    return TiltResult(
        optimal_weights=np.asarray(optimal, dtype=np.float64),
        tilted_weights=np.asarray(tilted, dtype=np.float64),
        caps=np.asarray(caps, dtype=np.float64),
        delta=np.asarray(tilted - optimal, dtype=np.float64),
        core_weight=core_total,
        satellite_weight=satellite_weight,
    )


def tilt_cost(
    optimal_weights: ArrayLike,
    tilted_weights: ArrayLike,
    mu: ArrayLike,
    cov: ArrayLike,
    *,
    risk_free: float = 0.0,
) -> TiltCost:
    """Compare the optimal and tilted mixes on return, risk, and Sharpe.

    Weights are over the same combined universe (core + picks); ``mu`` and
    ``cov`` describe that universe. This is what the UI surfaces as the honest
    "here's what your pick costs (or gains) you" line.
    """
    opt = np.asarray(optimal_weights, dtype=np.float64)
    tilt = np.asarray(tilted_weights, dtype=np.float64)
    m = np.asarray(mu, dtype=np.float64)
    c = np.asarray(cov, dtype=np.float64)

    opt_return = float(opt @ m)
    tilt_return = float(tilt @ m)
    opt_risk = portfolio_volatility(opt, c)
    tilt_risk = portfolio_volatility(tilt, c)
    return TiltCost(
        optimal_return=opt_return,
        tilted_return=tilt_return,
        optimal_risk=opt_risk,
        tilted_risk=tilt_risk,
        optimal_sharpe=sharpe_ratio(opt_return, opt_risk, risk_free=risk_free),
        tilted_sharpe=sharpe_ratio(tilt_return, tilt_risk, risk_free=risk_free),
    )
