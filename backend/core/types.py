"""Shared, immutable inputs for the finance engine.

Frozen dataclasses so a plan is a pure function of its inputs (nothing in the
engine mutates them). The profile rides in the request and the URL hash; it is
never stored server-side (accountless & stateless).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

__all__ = ["GoalKind", "Goal", "Profile"]


class GoalKind(StrEnum):
    """The kind of thing a goal is saving for."""

    RETIREMENT = "retirement"
    EDUCATION = "education"
    HOME = "home"
    EMERGENCY_FUND = "emergency_fund"
    BIG_PURCHASE = "big_purchase"
    GENERAL = "general"


@dataclass(frozen=True)
class Goal:
    """One thing the user is saving toward."""

    kind: GoalKind
    horizon_years: float
    target_amount: float = 0.0
    label: str = ""


@dataclass(frozen=True)
class Profile:
    """Who the user is, for adaptive planning. Defaults keep it light to build."""

    age: int
    retirement_age: int = 65
    dependents: int = 0
    income_stability: float = 1.0  # 0 (precarious) .. 1 (very stable)
    emergency_fund_months: float = 0.0
    has_high_interest_debt: bool = False
    goals: tuple[Goal, ...] = field(default_factory=tuple)
