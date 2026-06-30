"""Tests for `core.plan` — the plan orchestrator (METHODOLOGY §§5–11).

`build_plan` is the one place the engine's seven stages are composed. It owns no
new finance maths beyond two small, defensible glue rules (sleeve→core-fund
mapping and per-pick risk from beta), so these tests check the *wiring*: that
each stage's output feeds the next correctly, that the projection is reproducible
(same inputs → same cone), and that a user's picks are never dropped silently —
each one comes back with a stable disposition code and its screen reasons.
"""

import numpy as np
import pytest

from core.allocation import horizon_adjusted_sleeves
from core.ips import SECTION_KEYS
from core.plan import (
    BASE_CAP,
    HARD_CAP,
    SATELLITE_CAP,
    AssetClassView,
    CoreFund,
    MarketAssumptions,
    Pick,
    build_plan,
)
from core.risk_profiling import RiskBand
from core.scenarios import Scenario
from core.types import Goal, GoalKind, Profile

# --- A small, deterministic "world" (a mini capital-market-assumptions set) ---

_VIEWS = (
    AssetClassView("world_equity", expected_return=0.060, compound_return=0.050, volatility=0.150),
    AssetClassView("us_equity", expected_return=0.065, compound_return=0.052, volatility=0.165),
    AssetClassView(
        "global_agg_bonds", expected_return=0.020, compound_return=0.018, volatility=0.050
    ),
    AssetClassView("cash_chf", expected_return=0.008, compound_return=0.008, volatility=0.005),
    AssetClassView("gold", expected_return=0.030, compound_return=0.025, volatility=0.140),
)
# Order matches _VIEWS. Mild, PSD correlations (equities tight, bonds/cash/gold loose).
_CORR = (
    (1.00, 0.90, 0.20, 0.00, 0.10),
    (0.90, 1.00, 0.20, 0.00, 0.10),
    (0.20, 0.20, 1.00, 0.10, 0.20),
    (0.00, 0.00, 0.10, 1.00, 0.00),
    (0.10, 0.10, 0.20, 0.00, 1.00),
)
MARKET = MarketAssumptions(views=_VIEWS, correlation=_CORR)

# The clean 4-fund global core (one diversified fund per sleeve).
CORE_FUNDS = (
    CoreFund(sleeve="equity", ticker="VWCE.DE", name="FTSE All-World", asset_class="world_equity"),
    CoreFund(
        sleeve="bond",
        ticker="AGGS.SW",
        name="Global Agg (CHF-hedged)",
        asset_class="global_agg_bonds",
    ),
    CoreFund(sleeve="cash", ticker="CSBGC3.SW", name="Swiss gov 1-3y", asset_class="cash_chf"),
    CoreFund(sleeve="diversifier", ticker="SGLN.L", name="Physical gold", asset_class="gold"),
)

_3A_LIMIT_2026 = 7258.0


def _profile(**overrides: object) -> Profile:
    base: dict[str, object] = dict(
        age=30,
        retirement_age=65,
        dependents=0,
        income_stability=0.8,
        emergency_fund_months=6,
        goals=(Goal(kind=GoalKind.RETIREMENT, horizon_years=35, target_amount=1_000_000),),
    )
    base.update(overrides)
    return Profile(**base)  # type: ignore[arg-type]


def _build(**overrides: object):
    kwargs: dict[str, object] = dict(
        profile=_profile(),
        risk_answers=[4, 4, 3, 4, 4],
        picks=(),
        core_funds=CORE_FUNDS,
        market=MARKET,
        initial=10_000.0,
        monthly_contribution=500.0,
        pillar_3a_limit=_3A_LIMIT_2026,
    )
    kwargs.update(overrides)
    return build_plan(**kwargs)  # type: ignore[arg-type]


# --- Structure & the seven-stage wiring -----------------------------------


def test_allocation_weights_sum_to_one() -> None:
    plan = _build()
    total = sum(h.weight for h in plan.holdings)
    assert total == pytest.approx(1.0, abs=1e-9)


def test_sleeves_match_the_horizon_adjusted_policy_mix() -> None:
    plan = _build()
    expected = horizon_adjusted_sleeves(plan.risk.score, plan.horizon_years)
    assert plan.sleeves.equity == pytest.approx(expected.equity)
    assert plan.sleeves.bond == pytest.approx(expected.bond)


def test_risk_score_is_the_minimum_of_willingness_and_ability() -> None:
    plan = _build()
    assert plan.risk.score == pytest.approx(min(plan.risk.willingness, plan.risk.ability))
    assert plan.risk.band in set(RiskBand)


def test_no_picks_means_core_only_and_no_tilt_cost() -> None:
    plan = _build(picks=())
    assert plan.satellite_weight == pytest.approx(0.0)
    assert all(not h.is_satellite for h in plan.holdings)
    # With nothing tilted in, optimal == tilted, so the trade-off is zero.
    assert plan.tilt_cost.tilted_return == pytest.approx(plan.tilt_cost.optimal_return)


def test_ips_has_twelve_sections_and_passes_worst_year_loss_through() -> None:
    plan = _build()
    assert plan.ips.keys() == SECTION_KEYS
    risk_fields = plan.ips.section("how_much_risk").fields
    assert risk_fields["worst_year_loss"] == pytest.approx(plan.analytics.worst_year_loss)


# --- Reproducibility (Chinguun's requirement) ------------------------------


def test_same_inputs_produce_an_identical_cone() -> None:
    a = _build()
    b = _build()
    assert np.array_equal(a.cone.bands["p50"], b.cone.bands["p50"])
    assert np.array_equal(a.cone.bands["p10"], b.cone.bands["p10"])
    assert a.projection.median_terminal == b.projection.median_terminal


def test_projection_bands_are_ordered_low_median_high() -> None:
    plan = _build()
    assert plan.projection.low_terminal <= plan.projection.median_terminal
    assert plan.projection.median_terminal <= plan.projection.high_terminal


# --- The centerpiece: picks are included, capped, and explained -------------


def test_a_high_beta_pick_is_included_but_reduced_for_risk() -> None:
    nvda = Pick(
        ticker="NVDA",
        name="NVIDIA",
        asset_class="us_equity",
        beta=2.2,
        screen_passed=False,
        screen_reasons=("beta_too_high",),
    )
    plan = _build(picks=(nvda,))
    (d,) = plan.picks
    assert d.ticker == "NVDA"
    assert d.weight > 0.0  # included, never dropped
    assert d.cap < BASE_CAP  # a riskier pick earns a smaller cap
    assert d.note_code == "reduced_for_risk"
    assert d.screen_passed is False
    assert d.screen_reasons == ("beta_too_high",)
    # It shows up as a satellite holding in the plan.
    sats = [h for h in plan.holdings if h.is_satellite]
    assert [h.ticker for h in sats] == ["NVDA"]


def test_a_low_beta_pick_gets_its_full_weight() -> None:
    nestle = Pick(
        ticker="NESN.SW",
        name="Nestle",
        asset_class="world_equity",
        beta=0.5,
        screen_passed=True,
        screen_reasons=(),
    )
    plan = _build(picks=(nestle,))
    (d,) = plan.picks
    assert d.note_code == "included_at_full_weight"
    assert d.cap >= BASE_CAP


def test_too_many_picks_are_scaled_to_the_satellite_budget() -> None:
    picks = tuple(
        Pick(
            ticker=f"S{i}",
            name=f"Stock {i}",
            asset_class="us_equity",
            beta=0.5,
            screen_passed=True,
            screen_reasons=(),
        )
        for i in range(8)
    )
    plan = _build(picks=picks)
    assert plan.satellite_weight == pytest.approx(SATELLITE_CAP, abs=1e-9)
    assert all(d.note_code == "reduced_for_sleeve_budget" for d in plan.picks)
    # The diversified core is preserved at no less than 1 - satellite_cap.
    assert plan.core_weight == pytest.approx(1.0 - SATELLITE_CAP, abs=1e-9)


def test_a_single_stock_is_riskier_than_its_index_so_it_is_capped_tighter() -> None:
    # A beta-1 single stock carries idiosyncratic risk on top of the market, so it
    # must earn less room than the diversified index it sits in.
    stock = Pick(
        ticker="ONE",
        name="Beta-one stock",
        asset_class="world_equity",
        beta=1.0,
        screen_passed=True,
        screen_reasons=(),
    )
    fund = Pick(
        ticker="WS",
        name="World small-cap fund",
        asset_class="world_equity",
        beta=None,
        screen_passed=True,
        screen_reasons=(),
    )
    stock_cap = _build(picks=(stock,)).picks[0].cap
    fund_cap = _build(picks=(fund,)).picks[0].cap
    assert stock_cap < fund_cap  # the single name is sized more cautiously


def test_a_calm_fund_pick_is_capped_at_the_hard_limit() -> None:
    bond_fund = Pick(
        ticker="AGGS.SW",
        name="Global Agg",
        asset_class="global_agg_bonds",
        beta=None,
        screen_passed=True,
        screen_reasons=(),
    )
    (d,) = _build(picks=(bond_fund,)).picks
    assert d.note_code == "capped_at_hard_limit"
    assert d.cap == pytest.approx(HARD_CAP)


def test_screen_failing_pick_is_still_included_with_its_reasons() -> None:
    tsla = Pick(
        ticker="TSLA",
        name="Tesla",
        asset_class="us_equity",
        beta=1.8,
        screen_passed=False,
        screen_reasons=("beta_too_high",),
    )
    plan = _build(picks=(tsla,))
    (d,) = plan.picks
    assert d.weight > 0.0
    assert d.screen_passed is False
    assert "beta_too_high" in d.screen_reasons


# --- Scenarios, retirement, 3a, horizon ------------------------------------


def test_retirement_scenario_yields_a_required_contribution() -> None:
    plan = _build()
    assert Scenario.RETIREMENT in plan.scenarios
    assert plan.retirement is not None
    assert plan.retirement.capital_needed == pytest.approx(1_000_000)
    assert plan.retirement.required_monthly_contribution >= 0.0


def test_three_a_fills_the_tax_bucket_first() -> None:
    plan = _build(monthly_contribution=1_000.0)  # 12_000/yr > 7_258 limit
    assert plan.three_a.pillar_3a == pytest.approx(_3A_LIMIT_2026)
    assert plan.three_a.pillar_3a + plan.three_a.taxable == pytest.approx(12_000.0)


def test_horizon_falls_back_to_retirement_age_when_no_goals() -> None:
    plan = _build(profile=_profile(age=40, goals=()))
    assert plan.horizon_years == pytest.approx(25.0)  # 65 - 40


def test_risk_contributions_are_attached_per_holding_and_sum_to_one() -> None:
    plan = _build()
    total = sum(h.risk_contribution for h in plan.holdings)
    assert total == pytest.approx(1.0, abs=1e-6)


def test_a_retirement_goal_due_now_does_not_crash() -> None:
    # A 64-year-old with a retirement target due this year: no time left to save
    # monthly, so the plan reports the target with a zero contribution, not an error.
    profile = _profile(
        age=64,
        goals=(Goal(kind=GoalKind.RETIREMENT, horizon_years=0, target_amount=500_000),),
    )
    plan = _build(profile=profile)
    assert plan.retirement is not None
    assert plan.retirement.capital_needed == pytest.approx(500_000)
    assert plan.retirement.required_monthly_contribution == pytest.approx(0.0)


def test_funding_probability_uses_a_goal_that_has_a_target() -> None:
    # A long target-less "grow my money" goal plus a nearer goal that carries a
    # real target: the probability must reflect the target, not read as 1.0.
    profile = _profile(
        goals=(
            Goal(kind=GoalKind.GENERAL, horizon_years=40, target_amount=0),
            Goal(kind=GoalKind.RETIREMENT, horizon_years=35, target_amount=1_000_000),
        ),
    )
    plan = _build(profile=profile)
    assert 0.0 <= plan.projection.goal_funding_probability < 1.0


def test_effective_band_de_risks_for_a_short_horizon() -> None:
    # High appetite but a 3-year goal: the band the mix is built at is more
    # conservative than the appetite band, and the bridge is exposed.
    profile = _profile(
        age=30,
        income_stability=1.0,
        emergency_fund_months=6,
        goals=(Goal(kind=GoalKind.HOME, horizon_years=3, target_amount=50_000),),
    )
    plan = _build(profile=profile, risk_answers=[5, 5, 5, 5, 5])
    assert plan.risk.band == RiskBand.BALANCED  # appetite
    assert plan.effective_band == RiskBand.CONSERVATIVE  # what the mix is built at
    assert plan.adjusted_score == pytest.approx(15.0)


# --- Input validation ------------------------------------------------------


def test_missing_a_core_sleeve_is_rejected() -> None:
    incomplete = CORE_FUNDS[:3]  # drop the diversifier
    with pytest.raises(ValueError, match="core funds must cover"):
        _build(core_funds=incomplete)


def test_bad_risk_answers_propagate_a_clear_error() -> None:
    with pytest.raises(ValueError, match="between 1 and 5"):
        _build(risk_answers=[9, 9, 9])


def test_unknown_pick_asset_class_is_rejected() -> None:
    bad = Pick(
        ticker="???",
        name="Mystery",
        asset_class="crypto",
        beta=1.0,
        screen_passed=False,
        screen_reasons=(),
    )
    with pytest.raises(ValueError, match="no market assumption"):
        _build(picks=(bad,))
