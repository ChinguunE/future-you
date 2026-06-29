"""Strategic allocation (METHODOLOGY §7).

The long-run policy mix does ~90% of the work. A risk score (0–100, from
``risk_profiling``) becomes sleeve weights; a diversified core carries a capped
satellite for the user's picks; the horizon shapes the mix so soon-money is
safer than decades-money and a glide path de-risks as a goal approaches; and a
Swiss **3a-first** funding order fills the tax-advantaged bucket before taxable
savings (SWITZERLAND §2 — the dated 3a cap is supplied by the caller).

Pure float arithmetic — no numpy needed.
"""

from __future__ import annotations

from typing import NamedTuple

__all__ = [
    "Sleeves",
    "CoreSatellite",
    "ThreeASplit",
    "sleeve_weights",
    "core_satellite",
    "horizon_risk_cap",
    "horizon_adjusted_score",
    "horizon_adjusted_sleeves",
    "pillar_3a_split",
]

# Horizon at/above which the full risk score is allowed; below it, risk glides
# down toward zero as the goal approaches (de-risking window).
_FULL_RISK_HORIZON_YEARS = 20.0


class Sleeves(NamedTuple):
    """Strategic weights by asset class; the four sum to 1."""

    equity: float
    bond: float
    cash: float
    diversifier: float


class CoreSatellite(NamedTuple):
    """The split between the diversified core and the capped satellite."""

    core: float
    satellite: float


class ThreeASplit(NamedTuple):
    """A year's contribution divided into the 3a bucket and taxable savings."""

    pillar_3a: float
    taxable: float


def _check_score(score: float) -> float:
    if not 0.0 <= score <= 100.0:
        raise ValueError("risk score must be between 0 and 100")
    return score / 100.0


def sleeve_weights(risk_score: float) -> Sleeves:
    """Map a 0–100 risk score to equity / bond / cash / diversifier weights.

    Equity rises 20%→90% with risk; cash falls 15%→0%; a small diversifier
    sleeve stays at 5%; bonds take the balance (60%→5%). Higher risk therefore
    means more equity and less bond and cash.
    """
    s = _check_score(risk_score)
    equity = 0.20 + 0.70 * s
    cash = 0.15 * (1.0 - s)
    diversifier = 0.05
    bond = 1.0 - equity - cash - diversifier
    return Sleeves(equity=equity, bond=bond, cash=cash, diversifier=diversifier)


def core_satellite(satellite_request: float, *, cap: float) -> CoreSatellite:
    """Reserve a capped satellite sleeve; the diversified core takes the rest."""
    if satellite_request < 0.0:
        raise ValueError("satellite_request must be non-negative")
    if not 0.0 <= cap < 1.0:
        raise ValueError("cap must be in [0, 1)")
    satellite = min(satellite_request, cap)
    return CoreSatellite(core=1.0 - satellite, satellite=satellite)


def horizon_risk_cap(years: float) -> float:
    """The most risk a given horizon can justify, as a 0–100 score.

    Long horizons (≥ 20y) allow the full score; shorter horizons cap it
    proportionally, reaching 0 at the goal date. This single rule drives both
    goals-based bucketing and the glide path.
    """
    if years < 0.0:
        raise ValueError("years must be non-negative")
    return 100.0 * min(years / _FULL_RISK_HORIZON_YEARS, 1.0)


def horizon_adjusted_score(base_score: float, years: float) -> float:
    """Suitable risk for a goal: the lower of appetite and what the horizon allows."""
    return min(base_score, horizon_risk_cap(years))


def horizon_adjusted_sleeves(base_score: float, years: float) -> Sleeves:
    """Sleeve weights after capping the score by the goal's horizon."""
    return sleeve_weights(horizon_adjusted_score(base_score, years))


def pillar_3a_split(annual_budget: float, *, annual_limit: float) -> ThreeASplit:
    """Fill the tax-advantaged pillar-3a bucket first, then taxable savings.

    ``annual_limit`` is the dated, cited 3a cap supplied by the caller
    (SWITZERLAND §2: CHF 7,258 employee, 2026 — refresh annually).
    """
    if annual_budget < 0.0 or annual_limit < 0.0:
        raise ValueError("budget and limit must be non-negative")
    pillar = min(annual_budget, annual_limit)
    return ThreeASplit(pillar_3a=pillar, taxable=annual_budget - pillar)
