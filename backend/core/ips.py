"""Investment Policy Statement assembler (METHODOLOGY §11, IPS.md).

The capstone deliverable. This module does **no new computation**: it reorganises
an already-computed plan into the 12 canonical IPS sections. Each section carries
a stable ``key`` plus factual ``fields`` (numbers straight from the engine and
stable codes); the bilingual UI renders the headings and prose, so no English
strings are baked into the engine. Any AI prose downstream still obeys the
DATA.md number-verification rule.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import NamedTuple

from core.allocation import Sleeves
from core.risk_profiling import RiskProfile
from core.scenarios import Scenario
from core.types import Goal, Holding, Profile

__all__ = [
    "ProjectionSummary",
    "RetirementSummary",
    "IpsSection",
    "Ips",
    "SECTION_KEYS",
    "build_ips",
]

# The 12 sections, in canonical order (IPS.md).
SECTION_KEYS: tuple[str, ...] = (
    "plan_at_a_glance",
    "about_you",
    "what_youre_investing_for",
    "how_much_risk",
    "your_constraints",
    "money_by_timeframe",
    "target_mix",
    "what_to_expect",
    "when_to_rebalance",
    "when_markets_fall",
    "keeping_it_current",
    "the_fine_print",
)

# Goal-horizon buckets for the UBS-style Liquidity/Longevity/Legacy split.
_SOON_MAX_YEARS = 3.0
_LATER_MAX_YEARS = 15.0

# Swiss constraint note codes (UI renders the bilingual prose).
_SWISS_NOTES = (
    "pillar_3a",
    "foreign_withholding_da1",
    "no_private_capital_gains_tax",
    "stamp_duty",
)


class ProjectionSummary(NamedTuple):
    """Already-computed projection outcomes, stated as a range."""

    median_terminal: float
    low_terminal: float
    high_terminal: float
    goal_funding_probability: float


class RetirementSummary(NamedTuple):
    """Already-computed retirement figures."""

    capital_needed: float
    required_monthly_contribution: float


class IpsSection(NamedTuple):
    """One IPS section: a stable key and its factual content."""

    key: str
    fields: dict[str, object]


class Ips(NamedTuple):
    """The assembled IPS — sections in canonical order."""

    sections: tuple[IpsSection, ...]

    def keys(self) -> tuple[str, ...]:
        return tuple(section.key for section in self.sections)

    def section(self, key: str) -> IpsSection:
        for section in self.sections:
            if section.key == key:
                return section
        raise KeyError(key)


def _goal_dict(goal: Goal) -> dict[str, object]:
    return {
        "kind": goal.kind.value,
        "horizon_years": goal.horizon_years,
        "target_amount": goal.target_amount,
        "label": goal.label,
    }


def _holding_dict(holding: Holding) -> dict[str, object]:
    return {
        "name": holding.name,
        "weight": holding.weight,
        "is_satellite": holding.is_satellite,
        "cap": holding.cap,
    }


def _bucket_goals(goals: Sequence[Goal]) -> dict[str, list[dict[str, object]]]:
    buckets: dict[str, list[dict[str, object]]] = {"soon": [], "later": [], "beyond": []}
    for goal in goals:
        if goal.horizon_years < _SOON_MAX_YEARS:
            buckets["soon"].append(_goal_dict(goal))
        elif goal.horizon_years <= _LATER_MAX_YEARS:
            buckets["later"].append(_goal_dict(goal))
        else:
            buckets["beyond"].append(_goal_dict(goal))
    return buckets


def build_ips(
    *,
    profile: Profile,
    risk: RiskProfile,
    sleeves: Sleeves,
    holdings: Sequence[Holding],
    worst_year_loss: float,
    projection: ProjectionSummary,
    retirement: RetirementSummary | None = None,
    scenarios: frozenset[Scenario] = frozenset(),
    rebalance_band: float = 0.05,
) -> Ips:
    """Assemble the 12 IPS sections from a computed plan (no new maths)."""
    longest_horizon = max((g.horizon_years for g in profile.goals), default=0.0)

    sections = (
        IpsSection(
            "plan_at_a_glance",
            {
                "risk_band": risk.band.value,
                "scenarios": tuple(sorted(s.value for s in scenarios)),
            },
        ),
        IpsSection(
            "about_you",
            {
                "age": profile.age,
                "retirement_age": profile.retirement_age,
                "dependents": profile.dependents,
                "income_stability": profile.income_stability,
            },
        ),
        IpsSection(
            "what_youre_investing_for",
            {"goals": tuple(_goal_dict(g) for g in profile.goals)},
        ),
        IpsSection(
            "how_much_risk",
            {
                "willingness": risk.willingness,
                "ability": risk.ability,
                "score": risk.score,
                "band": risk.band.value,
                "worst_year_loss": worst_year_loss,
            },
        ),
        IpsSection(
            "your_constraints",
            {
                "horizon_years": longest_horizon,
                "emergency_fund_months": profile.emergency_fund_months,
                "swiss_notes": _SWISS_NOTES,
            },
        ),
        IpsSection("money_by_timeframe", {"buckets": _bucket_goals(profile.goals)}),
        IpsSection(
            "target_mix",
            {
                "sleeves": dict(sleeves._asdict()),
                "holdings": tuple(_holding_dict(h) for h in holdings),
            },
        ),
        IpsSection(
            "what_to_expect",
            {
                "median_terminal": projection.median_terminal,
                "low_terminal": projection.low_terminal,
                "high_terminal": projection.high_terminal,
                "goal_funding_probability": projection.goal_funding_probability,
                "capital_needed": retirement.capital_needed if retirement else None,
                "required_monthly_contribution": (
                    retirement.required_monthly_contribution if retirement else None
                ),
            },
        ),
        IpsSection(
            "when_to_rebalance",
            {"drift_band": rebalance_band, "annual_review": True},
        ),
        IpsSection("when_markets_fall", {"policy": "hold_and_rebalance"}),
        IpsSection("keeping_it_current", {"review_cadence": "annual_or_on_life_change"}),
        IpsSection(
            "the_fine_print",
            {"educational_not_advice": True, "finsa_aware": True, "no_guarantees": True},
        ),
    )
    return Ips(sections=sections)
