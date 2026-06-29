"""Retirement — the saving phase (METHODOLOGY §9).

How big the pot must be, in today's spending power, and how much to save each
month to get there. The contribution solver is the exact inverse of the
future-value projection, so "save this much" always reproduces the target.

Annual steps; reuses the future-value engine in :mod:`core.projections`.
"""

from __future__ import annotations

from core.projections import fv_contributions, fv_lump_sum

__all__ = ["real_rate", "capital_needed", "required_contribution"]


def real_rate(nominal_rate: float, inflation_rate: float) -> float:
    """Fisher real rate: ``(1 + nominal) / (1 + inflation) − 1``.

    What your money truly grows in *spending power*, not nominal francs.
    """
    if inflation_rate <= -1.0:
        raise ValueError("inflation_rate must be greater than -100%")
    return float((1.0 + nominal_rate) / (1.0 + inflation_rate) - 1.0)


def capital_needed(
    annual_income: float, years: float, real_rate: float, *, timing: str = "begin"
) -> float:
    """Present value of a steady retirement income — the pot you must amass.

    An annuity over ``years`` at ``real_rate``; ``timing="begin"`` (annuity-due,
    the default) assumes the first year's income is drawn at the start of
    retirement, which is the prudent, slightly larger figure.
    """
    if timing not in ("begin", "end"):
        raise ValueError("timing must be 'begin' or 'end'")
    if annual_income < 0:
        raise ValueError("annual_income must be non-negative")
    n = int(round(years))
    if n < 0:
        raise ValueError("years must be non-negative")
    if real_rate == 0.0:
        return float(annual_income * n)
    ordinary = annual_income * (1.0 - (1.0 + real_rate) ** (-n)) / real_rate
    if timing == "begin":
        ordinary *= 1.0 + real_rate
    return float(ordinary)


def required_contribution(
    target: float,
    current_savings: float,
    annual_rate: float,
    years: float,
    *,
    timing: str = "end",
) -> float:
    """Monthly contribution needed to reach ``target`` — the inverse of FV.

    ``target = FV(current_savings) + FV(contributions)``, solved for the
    contribution. Returns 0 when today's savings already grow past the target.
    """
    fv_current = fv_lump_sum(current_savings, annual_rate, years)
    annuity_factor = fv_contributions(1.0, annual_rate, years, timing=timing)
    if annuity_factor <= 0.0:
        raise ValueError("no contribution periods; cannot solve")
    raw = (target - fv_current) / annuity_factor
    return float(max(0.0, raw))
