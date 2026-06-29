"""Known-answer tests for `core.scenarios` (METHODOLOGY §8).

Adaptive detection: from the profile, surface only the planning needs that
actually apply — no manual module toggling. Each case maps a profile to its
expected set of scenarios.
"""

from core import scenarios
from core.scenarios import Scenario
from core.types import Goal, GoalKind, Profile


def test_young_saver_with_a_thin_cushion() -> None:
    profile = Profile(age=25, retirement_age=65, emergency_fund_months=1.0)
    assert scenarios.detect_scenarios(profile) == frozenset(
        {Scenario.EMERGENCY_FUND, Scenario.RETIREMENT}
    )


def test_parent_with_high_interest_debt() -> None:
    profile = Profile(
        age=40,
        dependents=2,
        emergency_fund_months=6.0,
        has_high_interest_debt=True,
    )
    assert scenarios.detect_scenarios(profile) == frozenset(
        {Scenario.DEBT_VS_INVEST, Scenario.RETIREMENT, Scenario.EDUCATION}
    )


def test_retiree_is_decumulating_not_accumulating() -> None:
    profile = Profile(age=70, retirement_age=65, emergency_fund_months=12.0)
    detected = scenarios.detect_scenarios(profile)
    assert detected == frozenset({Scenario.DECUMULATION})
    # Accumulation and decumulation are mutually exclusive.
    assert Scenario.RETIREMENT not in detected


def test_explicit_goals_surface_their_scenarios() -> None:
    profile = Profile(
        age=30,
        emergency_fund_months=6.0,
        goals=(
            Goal(kind=GoalKind.HOME, horizon_years=5, target_amount=100_000),
            Goal(kind=GoalKind.BIG_PURCHASE, horizon_years=3, target_amount=20_000),
        ),
    )
    assert scenarios.detect_scenarios(profile) == frozenset(
        {Scenario.RETIREMENT, Scenario.HOME_DEPOSIT, Scenario.BIG_PURCHASE}
    )


def test_well_prepared_accumulator_only_sees_retirement() -> None:
    profile = Profile(age=35, emergency_fund_months=6.0, dependents=0)
    assert scenarios.detect_scenarios(profile) == frozenset({Scenario.RETIREMENT})
