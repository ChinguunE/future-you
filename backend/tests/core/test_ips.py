"""Tests for `core.ips` (METHODOLOGY §11) — the IPS assembler.

The IPS does **no new computation**: it reorganises an already-computed plan into
the 12 canonical sections (IPS.md). These tests check the structure and that
every value is a faithful pass-through of its input.
"""

import pytest

from core import ips
from core.allocation import sleeve_weights
from core.ips import ProjectionSummary, RetirementSummary
from core.risk_profiling import RiskBand, risk_profile
from core.types import Goal, GoalKind, Holding, Profile


def _plan_kwargs() -> dict[str, object]:
    profile = Profile(
        age=30,
        retirement_age=65,
        dependents=1,
        emergency_fund_months=6,
        goals=(
            Goal(kind=GoalKind.HOME, horizon_years=5, target_amount=100_000),
            Goal(kind=GoalKind.RETIREMENT, horizon_years=35, target_amount=1_000_000),
        ),
    )
    risk = risk_profile(willingness=70, ability=60)  # min 60 -> moderately_aggressive
    return {
        "profile": profile,
        "risk": risk,
        "sleeves": sleeve_weights(risk.score),
        "holdings": (
            Holding(name="World Equity ETF", weight=0.80),
            Holding(name="NVDA", weight=0.05, is_satellite=True, cap=0.05),
        ),
        "worst_year_loss": 0.28,
        "projection": ProjectionSummary(
            median_terminal=500_000, low_terminal=300_000, high_terminal=800_000,
            goal_funding_probability=0.85,
        ),
        "retirement": RetirementSummary(
            capital_needed=1_000_000, required_monthly_contribution=900
        ),
    }


def test_twelve_sections_in_canonical_order() -> None:
    doc = ips.build_ips(**_plan_kwargs())  # type: ignore[arg-type]
    assert doc.keys() == ips.SECTION_KEYS
    assert len(ips.SECTION_KEYS) == 12


def test_risk_section_passes_values_through_unchanged() -> None:
    doc = ips.build_ips(**_plan_kwargs())  # type: ignore[arg-type]
    fields = doc.section("how_much_risk").fields
    assert fields["willingness"] == pytest.approx(70.0)
    assert fields["ability"] == pytest.approx(60.0)
    assert fields["score"] == pytest.approx(60.0)
    assert fields["band"] == RiskBand.MODERATELY_AGGRESSIVE
    assert fields["worst_year_loss"] == pytest.approx(0.28)  # not recomputed


def test_goals_section_lists_every_goal() -> None:
    doc = ips.build_ips(**_plan_kwargs())  # type: ignore[arg-type]
    goals = doc.section("what_youre_investing_for").fields["goals"]
    assert isinstance(goals, tuple)
    assert len(goals) == 2


def test_target_mix_carries_sleeves_and_holdings() -> None:
    kwargs = _plan_kwargs()
    doc = ips.build_ips(**kwargs)  # type: ignore[arg-type]
    fields = doc.section("target_mix").fields
    sleeves = kwargs["sleeves"]
    assert fields["sleeves"]["equity"] == pytest.approx(sleeves.equity)  # type: ignore[index,union-attr]
    assert len(fields["holdings"]) == 2  # type: ignore[arg-type]


def test_what_to_expect_carries_projection_and_retirement() -> None:
    doc = ips.build_ips(**_plan_kwargs())  # type: ignore[arg-type]
    fields = doc.section("what_to_expect").fields
    assert fields["median_terminal"] == pytest.approx(500_000)
    assert fields["goal_funding_probability"] == pytest.approx(0.85)
    assert fields["capital_needed"] == pytest.approx(1_000_000)


def test_retirement_is_optional() -> None:
    kwargs = _plan_kwargs()
    kwargs["retirement"] = None
    doc = ips.build_ips(**kwargs)  # type: ignore[arg-type]
    fields = doc.section("what_to_expect").fields
    assert fields["capital_needed"] is None  # gracefully absent


def test_fine_print_is_always_present() -> None:
    doc = ips.build_ips(**_plan_kwargs())  # type: ignore[arg-type]
    fields = doc.section("the_fine_print").fields
    assert fields["educational_not_advice"] is True
