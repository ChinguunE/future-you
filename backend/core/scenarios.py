"""Adaptive scenario detection (METHODOLOGY §8).

From the profile, surface only the planning needs that actually apply — so the
user never hand-toggles a "retirement planner" or an "education saver". The
rules are deliberately simple and explainable.
"""

from __future__ import annotations

from enum import StrEnum

from core.types import GoalKind, Profile

__all__ = ["Scenario", "detect_scenarios"]

# Below this cushion we surface "build an emergency fund" first.
_EMERGENCY_TARGET_MONTHS = 3.0


class Scenario(StrEnum):
    """A planning module that may apply to the user."""

    EMERGENCY_FUND = "emergency_fund"
    DEBT_VS_INVEST = "debt_vs_invest"
    RETIREMENT = "retirement"
    DECUMULATION = "decumulation"
    EDUCATION = "education"
    HOME_DEPOSIT = "home_deposit"
    BIG_PURCHASE = "big_purchase"


# Explicit-goal kinds that each switch on a planning scenario.
_GOAL_SCENARIOS: dict[GoalKind, Scenario] = {
    GoalKind.HOME: Scenario.HOME_DEPOSIT,
    GoalKind.EDUCATION: Scenario.EDUCATION,
    GoalKind.BIG_PURCHASE: Scenario.BIG_PURCHASE,
}


def detect_scenarios(profile: Profile) -> frozenset[Scenario]:
    """Return the set of planning scenarios that apply to ``profile``."""
    applicable: set[Scenario] = set()

    # Foundations first: a thin cushion or expensive debt come before investing.
    if profile.emergency_fund_months < _EMERGENCY_TARGET_MONTHS:
        applicable.add(Scenario.EMERGENCY_FUND)
    if profile.has_high_interest_debt:
        applicable.add(Scenario.DEBT_VS_INVEST)

    # Accumulating toward retirement vs already drawing down — mutually exclusive.
    if profile.age < profile.retirement_age:
        applicable.add(Scenario.RETIREMENT)
    else:
        applicable.add(Scenario.DECUMULATION)

    # Dependents imply an education-saving need even without an explicit goal.
    if profile.dependents > 0:
        applicable.add(Scenario.EDUCATION)

    # Explicit goals switch on their own scenarios.
    for goal in profile.goals:
        scenario = _GOAL_SCENARIOS.get(goal.kind)
        if scenario is not None:
            applicable.add(scenario)

    return frozenset(applicable)
