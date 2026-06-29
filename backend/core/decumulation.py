"""Decumulation — the withdrawal phase (METHODOLOGY §9).

The safe withdrawal that exactly drains a pot over a horizon (the inverse of
capital-needs), and sequence-of-returns stress: the same returns in the worst
order, with the same withdrawals, leave you poorer than the average path — the
risk of a rough *early* retirement.

Annual steps; reuses :func:`core.projections.terminal_value` and
:func:`core.retirement.capital_needed`.
"""

from __future__ import annotations

from collections.abc import Sequence

from core.projections import terminal_value
from core.retirement import capital_needed

__all__ = [
    "safe_withdrawal_amount",
    "withdrawal_terminal",
    "average_path_terminal",
    "sequence_stress_terminal",
]


def safe_withdrawal_amount(
    initial: float, real_rate: float, years: float, *, timing: str = "begin"
) -> float:
    """The level income a pot can sustain for ``years`` — the inverse of capital_needed."""
    factor = capital_needed(1.0, years, real_rate, timing=timing)
    if factor <= 0.0:
        raise ValueError("withdrawal horizon must be at least one year")
    return float(initial / factor)


def withdrawal_terminal(
    initial: float, returns: Sequence[float], annual_withdrawal: float, *, timing: str = "start"
) -> float:
    """Pot remaining after an *ordered* return sequence with yearly withdrawals.

    ``timing="start"`` draws the income at the start of each year (before that
    year's return), the prudent retirement convention.
    """
    return terminal_value(initial, returns, cashflow=-annual_withdrawal, timing=timing)


def average_path_terminal(
    initial: float, mean_return: float, annual_withdrawal: float, years: int
) -> float:
    """Terminal pot if every year earned exactly the mean return (the smooth path)."""
    if years < 0:
        raise ValueError("years must be non-negative")
    return withdrawal_terminal(initial, [mean_return] * years, annual_withdrawal)


def sequence_stress_terminal(
    initial: float, returns: Sequence[float], annual_withdrawal: float
) -> float:
    """Terminal pot under the worst ordering — the bad years arrive first."""
    worst_first = sorted(returns)
    return withdrawal_terminal(initial, worst_first, annual_withdrawal)
