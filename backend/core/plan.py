"""Plan orchestrator — composing the engine into one personalised plan.

The seven engine stages (risk profiling → safe-screen → optimisation → tilts →
allocation/glide → projection → IPS) are deliberately small, independent, pure
functions. This module is the *one* place they are sequenced into a whole plan,
so the FastAPI layer can stay a thin adapter: it loads the committed snapshots,
adapts them into the plain inputs below, calls :func:`build_plan`, and serialises
the result. Nothing here touches the web, the filesystem, or a data provider —
it is as pure and unit-tested as the rest of ``core/``.

Two small glue rules live here because they are finance decisions, not plumbing:

* **Sleeve → core fund.** The strategic mix (equity / bond / cash / diversifier)
  is carried by one diversified fund per sleeve — the clean global core. The
  optimiser (``core.frontier``) is a teaching overlay, not the weight generator
  (METHODOLOGY §4: rule-based allocation anchors, MVO informs).
* **Per-pick risk.** A satellite stock is sized by its *total* risk — its
  systematic part ``beta · equity_vol`` combined in quadrature with an
  idiosyncratic term (``_IDIOSYNCRATIC_VOL``), measured against a neutral,
  beta-1 single stock — so a riskier name earns a smaller responsible cap
  (METHODOLOGY §5). Fund picks use their asset class's own volatility.

The projection seed is a fixed constant, so the same request always yields the
same cone — a plan is reproducible and a share-link always reopens identically.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np

from core.allocation import (
    Sleeves,
    ThreeASplit,
    horizon_adjusted_score,
    pillar_3a_split,
    sleeve_weights,
)
from core.analytics import (
    parametric_cvar,
    parametric_var,
    percent_risk_contributions,
    sharpe_ratio,
)
from core.ips import Ips, ProjectionSummary, RetirementSummary, build_ips
from core.moments import corr_to_cov, nearest_psd, portfolio_volatility
from core.projections import ConeResult, projection_cone
from core.retirement import required_contribution
from core.risk_profiling import (
    RiskBand,
    RiskProfile,
    ability_score,
    profile_band,
    risk_profile,
    willingness_score,
)
from core.scenarios import Scenario, detect_scenarios
from core.tilts import TiltCost, TiltResult, blend_views, tilt_cost
from core.types import Goal, GoalKind, Holding, Profile

__all__ = [
    "AssetClassView",
    "MarketAssumptions",
    "CoreFund",
    "Pick",
    "PickDisposition",
    "PlanHolding",
    "PlanAnalytics",
    "PlanResult",
    "build_plan",
    "SLEEVE_ORDER",
    "SATELLITE_CAP",
    "BASE_CAP",
    "HARD_CAP",
    "TILT_STRENGTH",
    "PROJECTION_SEED",
    "PROJECTION_PATHS",
    "REBALANCE_BAND",
    "VAR_CONFIDENCE",
    "MONTHS_PER_YEAR",
]

# --- Policy constants (documented, tunable) --------------------------------

# The four strategic sleeves, in the canonical order the core funds must cover.
SLEEVE_ORDER: tuple[str, ...] = ("equity", "bond", "cash", "diversifier")

# Tilt guardrails (METHODOLOGY §5). A reference-risk pick earns BASE_CAP; no single
# pick may exceed HARD_CAP; all picks together may not exceed SATELLITE_CAP.
SATELLITE_CAP = 0.20
BASE_CAP = 0.05
HARD_CAP = 0.10
TILT_STRENGTH = 1.0

# A satellite single stock is sized by its TOTAL volatility, not just its
# systematic (beta) part — a single name also carries diversifiable, idiosyncratic
# risk. We add a conservative idiosyncratic volatility (combined in quadrature) so
# a calm-looking single stock cannot quietly reach the hard cap (METHODOLOGY §5 —
# the caps are what stop "include what you want" becoming "bet the plan").
_IDIOSYNCRATIC_VOL = 0.22

# Projection. A fixed seed makes the Monte-Carlo cone reproducible (METHODOLOGY §2).
PROJECTION_SEED = 12345
PROJECTION_PATHS = 10_000

REBALANCE_BAND = 0.05
VAR_CONFIDENCE = 0.95
MONTHS_PER_YEAR = 12

# Weights below this are treated as zero and dropped from the holdings list.
_ZERO_WEIGHT = 1e-9


# --- Plain inputs the API adapts the snapshots into ------------------------


@dataclass(frozen=True)
class AssetClassView:
    """One asset class's capital-market assumptions (a row of the CMA snapshot)."""

    asset_class: str
    expected_return: float  # arithmetic mean — the optimiser / analytics μ
    compound_return: float  # geometric mean — the projection's drift
    volatility: float


@dataclass(frozen=True)
class MarketAssumptions:
    """The CMA: per-asset-class views plus the correlation matrix (aligned order)."""

    views: tuple[AssetClassView, ...]
    correlation: tuple[tuple[float, ...], ...]

    def view(self, asset_class: str) -> AssetClassView:
        for v in self.views:
            if v.asset_class == asset_class:
                return v
        raise ValueError(f"no market assumption for asset class {asset_class!r}")

    def _index(self) -> dict[str, int]:
        return {v.asset_class: i for i, v in enumerate(self.views)}

    def correlation_submatrix(self, asset_classes: Sequence[str]) -> np.ndarray:
        """Correlations for an ordered list of asset classes (repeats allowed).

        Two positions sharing an asset class inherit correlation 1.0 — a single
        stock is proxied by its asset class for *co-movement*; its own (larger)
        volatility is applied separately when the covariance is rebuilt.
        """
        for ac in asset_classes:
            self.view(ac)  # validate membership, with a clear error
        idx = self._index()
        base = self.correlation
        return np.asarray(
            [[base[idx[a]][idx[b]] for b in asset_classes] for a in asset_classes],
            dtype=np.float64,
        )


@dataclass(frozen=True)
class CoreFund:
    """A diversified core building block — one fund standing in for a sleeve."""

    sleeve: str  # one of SLEEVE_ORDER
    ticker: str
    name: str
    asset_class: str


@dataclass(frozen=True)
class Pick:
    """A user-requested name to tilt in as a capped satellite.

    ``beta`` is set for stock picks (risk = beta · reference equity vol) and
    ``None`` for fund picks (risk = the asset class's own volatility). The screen
    result is carried through from the snapshot so a failing pick is still
    *included* — bounded and explained, never silently dropped (METHODOLOGY §5).
    """

    ticker: str
    name: str
    asset_class: str
    beta: float | None
    screen_passed: bool
    screen_reasons: tuple[str, ...]


# --- Structured outputs the API serialises ---------------------------------


@dataclass(frozen=True)
class PlanHolding:
    """One position in the final plan, enriched for the UI."""

    ticker: str
    name: str
    asset_class: str
    role: str  # "core" | "satellite"
    weight: float
    is_satellite: bool
    cap: float | None
    risk_contribution: float  # this holding's share of total portfolio risk (sums to 1)


@dataclass(frozen=True)
class PickDisposition:
    """What happened to one requested pick — the 'include it, explain it' record."""

    ticker: str
    name: str
    weight: float  # achieved weight in the final mix
    cap: float  # the risk-adjusted cap applied
    note_code: str  # included_at_full_weight | reduced_for_risk | reduced_for_sleeve_budget
    screen_passed: bool
    screen_reasons: tuple[str, ...]


@dataclass(frozen=True)
class PlanAnalytics:
    """Risk-adjusted analytics for the final mix (METHODOLOGY §3)."""

    expected_return: float  # arithmetic, annual
    volatility: float  # annual
    sharpe: float
    value_at_risk_monthly: float  # 95% — "a bad month could be about −X"
    conditional_var_monthly: float  # 95% expected shortfall
    worst_year_loss: float  # 95% annual VaR (also feeds the IPS)


@dataclass(frozen=True)
class PlanResult:
    """The whole computed plan — every number the API needs, in one bundle."""

    risk: RiskProfile
    adjusted_score: float  # risk score after the horizon glide-path cap
    effective_band: RiskBand  # the band the mix is actually built at (vs risk.band = appetite)
    scenarios: frozenset[Scenario]
    sleeves: Sleeves
    holdings: tuple[PlanHolding, ...]
    core_weight: float
    satellite_weight: float
    tilt: TiltResult
    tilt_cost: TiltCost
    picks: tuple[PickDisposition, ...]
    cone: ConeResult
    projection: ProjectionSummary
    analytics: PlanAnalytics
    retirement: RetirementSummary | None
    three_a: ThreeASplit
    ips: Ips
    horizon_years: float
    annual_mean: float  # geometric — the projection drift
    annual_vol: float
    seed: int


# --- Helpers ---------------------------------------------------------------


def _ordered_core(core_funds: Sequence[CoreFund]) -> list[CoreFund]:
    by_sleeve = {f.sleeve: f for f in core_funds}
    if set(by_sleeve) != set(SLEEVE_ORDER) or len(core_funds) != len(SLEEVE_ORDER):
        raise ValueError(f"core funds must cover exactly the sleeves {SLEEVE_ORDER}")
    return [by_sleeve[s] for s in SLEEVE_ORDER]


def _planning_horizon(profile: Profile) -> float:
    """The horizon that shapes the headline mix and projection.

    The longest goal's horizon; with no goals, the years to retirement.
    """
    if profile.goals:
        return float(max(g.horizon_years for g in profile.goals))
    return float(max(profile.retirement_age - profile.age, 0))


def _retirement_goal(profile: Profile) -> Goal | None:
    for goal in profile.goals:
        if goal.kind == GoalKind.RETIREMENT:
            return goal
    return None


def _pick_risk(pick: Pick, *, equity_vol: float, market: MarketAssumptions) -> float:
    """A pick's volatility for sizing.

    A single stock carries systematic risk (``beta · equity_vol``) **and**
    idiosyncratic risk, combined in quadrature — so a calm-looking single name
    still can't reach the hard cap (METHODOLOGY §5). A fund pick is already
    diversified, so it sizes off its asset class's own volatility.
    """
    if pick.beta is not None:
        return float(np.hypot(pick.beta * equity_vol, _IDIOSYNCRATIC_VOL))
    return market.view(pick.asset_class).volatility


def build_plan(
    *,
    profile: Profile,
    risk_answers: Sequence[float],
    picks: Sequence[Pick],
    core_funds: Sequence[CoreFund],
    market: MarketAssumptions,
    initial: float,
    monthly_contribution: float,
    pillar_3a_limit: float,
    annual_budget: float | None = None,
) -> PlanResult:
    """Compose the engine into one personalised, reproducible plan.

    The FastAPI layer adapts the committed snapshots into ``core_funds``,
    ``market``, and ``picks``, then calls this. Every number returned traces to
    an engine function over the supplied assumptions — nothing is invented here.
    """
    ordered = _ordered_core(core_funds)
    horizon = _planning_horizon(profile)

    # Stage 0 — risk profiling: willingness (quiz) vs ability (capacity), min binds.
    willingness = willingness_score(risk_answers)
    ability = ability_score(
        horizon_years=horizon,
        income_stability=profile.income_stability,
        emergency_fund_months=profile.emergency_fund_months,
    )
    risk = risk_profile(willingness, ability)

    # Stage 4 — strategic allocation, de-risked by the horizon (glide path). The
    # appetite band (risk.band) and the band the mix is actually built at can
    # diverge for short-horizon goals; effective_band makes the de-risking legible.
    adjusted_score = horizon_adjusted_score(risk.score, horizon)
    effective_band = profile_band(adjusted_score)
    sleeves = sleeve_weights(adjusted_score)
    core_weights = np.array([getattr(sleeves, s) for s in SLEEVE_ORDER], dtype=np.float64)

    # Stage 3 — tilt the user's picks onto the core, sized by risk and capped. The
    # cap reference is a neutral, beta-1 single stock, so a riskier name earns a
    # smaller responsible weight and a calmer one earns more (up to the hard cap).
    equity_vol = market.view(ordered[0].asset_class).volatility
    reference_risk = float(np.hypot(equity_vol, _IDIOSYNCRATIC_VOL))
    pick_risks = np.array(
        [_pick_risk(p, equity_vol=equity_vol, market=market) for p in picks],
        dtype=np.float64,
    )
    tilt = blend_views(
        core_weights,
        pick_risks,
        reference_risk=reference_risk,
        base_cap=BASE_CAP,
        hard_cap=HARD_CAP,
        satellite_cap=SATELLITE_CAP,
        tilt_strength=TILT_STRENGTH,
    )

    # Build the combined-universe assumptions [core..., picks...] for risk & cost.
    combined_classes = [f.asset_class for f in ordered] + [p.asset_class for p in picks]
    mu_arith = np.array([market.view(ac).expected_return for ac in combined_classes])
    mu_geo = np.array([market.view(ac).compound_return for ac in combined_classes])
    vols = np.concatenate(
        [
            np.array([market.view(f.asset_class).volatility for f in ordered]),
            pick_risks,
        ]
    )
    # nearest_psd guards against a snapshot whose correlations are only near-PSD,
    # so portfolio variance can never go slightly negative (METHODOLOGY §1).
    cov = nearest_psd(corr_to_cov(market.correlation_submatrix(combined_classes), vols))
    weights = tilt.tilted_weights

    annual_vol = portfolio_volatility(weights, cov)
    annual_mean = float(weights @ mu_geo)  # geometric — drives the projection
    expected_return = float(weights @ mu_arith)  # arithmetic — drives Sharpe/VaR
    # tilt.optimal_weights is the rule-based POLICY mix (the anchor), not an MVO
    # optimum, so this is the honest cost of tilting away from the diversified core.
    cost = tilt_cost(tilt.optimal_weights, weights, mu_arith, cov)

    # Stage 5 — projection: a reproducible Monte-Carlo cone over the headline horizon.
    cone = projection_cone(
        initial,
        monthly_contribution,
        annual_mean=annual_mean,
        annual_vol=annual_vol,
        years=horizon,
        n_paths=PROJECTION_PATHS,
        seed=PROJECTION_SEED,
    )
    # Probability against the longest-dated goal that actually carries a target
    # (a target-less goal would otherwise read as trivially "fully funded").
    funded = [g for g in profile.goals if g.target_amount > 0.0]
    primary = max(funded, key=lambda g: g.horizon_years, default=None)
    target = primary.target_amount if primary else 0.0
    funding_prob = float(np.mean(cone.terminal >= target)) if target > 0.0 else 1.0
    projection = ProjectionSummary(
        median_terminal=float(cone.bands["p50"][-1]),
        low_terminal=float(cone.bands["p10"][-1]),
        high_terminal=float(cone.bands["p90"][-1]),
        goal_funding_probability=funding_prob,
    )

    # Stage 3 (analytics) — risk-adjusted view of the final mix. Monthly tail
    # figures scale the arithmetic mean and vol consistently by 1/12 and 1/√12.
    monthly_mean = expected_return / MONTHS_PER_YEAR
    monthly_vol = annual_vol / np.sqrt(MONTHS_PER_YEAR)
    worst_year_loss = parametric_var(expected_return, annual_vol, confidence=VAR_CONFIDENCE)
    analytics = PlanAnalytics(
        expected_return=expected_return,
        volatility=annual_vol,
        sharpe=sharpe_ratio(expected_return, annual_vol),
        value_at_risk_monthly=parametric_var(monthly_mean, monthly_vol, confidence=VAR_CONFIDENCE),
        conditional_var_monthly=parametric_cvar(
            monthly_mean, monthly_vol, confidence=VAR_CONFIDENCE
        ),
        worst_year_loss=worst_year_loss,
    )

    # Build the enriched holdings (core funds + picks), each with its risk share.
    # Every CMA asset class has positive volatility and the weights sum to 1, so the
    # portfolio volatility is always positive here.
    pct_risk = percent_risk_contributions(weights, cov)
    holdings: list[PlanHolding] = []
    for i, fund in enumerate(ordered):
        if weights[i] <= _ZERO_WEIGHT:
            continue  # e.g. a 0% cash sleeve at maximum risk
        holdings.append(
            PlanHolding(
                ticker=fund.ticker,
                name=fund.name,
                asset_class=fund.asset_class,
                role="core",
                weight=float(weights[i]),
                is_satellite=False,
                cap=None,
                risk_contribution=float(pct_risk[i]),
            )
        )
    n_core = len(ordered)
    for j, pick in enumerate(picks):
        idx = n_core + j
        holdings.append(
            PlanHolding(
                ticker=pick.ticker,
                name=pick.name,
                asset_class=pick.asset_class,
                role="satellite",
                weight=float(weights[idx]),
                is_satellite=True,
                cap=float(tilt.caps[idx]),
                risk_contribution=float(pct_risk[idx]),
            )
        )

    dispositions = _pick_dispositions(picks, tilt, n_core=n_core)

    # Stage 5b — retirement: months-to-save to hit a stated target (scenario-gated).
    scenarios = detect_scenarios(profile)
    retirement = _retirement_summary(profile, scenarios, initial=initial, annual_mean=annual_mean)

    # Swiss 3a-first funding order over the annual savings budget.
    budget = annual_budget if annual_budget is not None else monthly_contribution * MONTHS_PER_YEAR
    three_a = pillar_3a_split(budget, annual_limit=pillar_3a_limit)

    # Stage 6 — assemble the IPS (no new maths; reorganises the computed plan).
    ips_holdings = [
        Holding(name=h.name, weight=h.weight, is_satellite=h.is_satellite, cap=h.cap)
        for h in holdings
    ]
    ips = build_ips(
        profile=profile,
        risk=risk,
        sleeves=sleeves,
        holdings=ips_holdings,
        worst_year_loss=worst_year_loss,
        projection=projection,
        retirement=retirement,
        scenarios=scenarios,
        rebalance_band=REBALANCE_BAND,
    )

    return PlanResult(
        risk=risk,
        adjusted_score=adjusted_score,
        effective_band=effective_band,
        scenarios=scenarios,
        sleeves=sleeves,
        holdings=tuple(holdings),
        core_weight=tilt.core_weight,
        satellite_weight=tilt.satellite_weight,
        tilt=tilt,
        tilt_cost=cost,
        picks=dispositions,
        cone=cone,
        projection=projection,
        analytics=analytics,
        retirement=retirement,
        three_a=three_a,
        ips=ips,
        horizon_years=horizon,
        annual_mean=annual_mean,
        annual_vol=annual_vol,
        seed=PROJECTION_SEED,
    )


def _pick_dispositions(
    picks: Sequence[Pick], tilt: TiltResult, *, n_core: int
) -> tuple[PickDisposition, ...]:
    """Explain each pick — it is never dropped, only bounded and labelled.

    The UI pairs ``note_code`` with the screen reasons to say e.g. "added NVDA at
    a reduced 4.5% — it's higher-risk, so we capped it." The codes, in priority:

    * ``reduced_for_sleeve_budget`` — all picks together hit the satellite cap.
    * ``capped_at_hard_limit`` — a single calm name pinned at the hard per-name cap.
    * ``reduced_for_risk`` — a riskier-than-neutral name earned a smaller cap.
    * ``included_at_full_weight`` — sized at its risk-adjusted cap, nothing binding.
    """
    pick_caps = tilt.caps[n_core:]
    total_desired = float(np.sum(TILT_STRENGTH * pick_caps))
    sleeve_bound = total_desired > SATELLITE_CAP + 1e-12

    out: list[PickDisposition] = []
    for j, pick in enumerate(picks):
        cap = float(pick_caps[j])
        if sleeve_bound:
            note = "reduced_for_sleeve_budget"
        elif cap >= HARD_CAP - 1e-9:
            note = "capped_at_hard_limit"
        elif cap < BASE_CAP - 1e-9:
            note = "reduced_for_risk"
        else:
            note = "included_at_full_weight"
        out.append(
            PickDisposition(
                ticker=pick.ticker,
                name=pick.name,
                weight=float(tilt.tilted_weights[n_core + j]),
                cap=cap,
                note_code=note,
                screen_passed=pick.screen_passed,
                screen_reasons=pick.screen_reasons,
            )
        )
    return tuple(out)


def _retirement_summary(
    profile: Profile,
    scenarios: frozenset[Scenario],
    *,
    initial: float,
    annual_mean: float,
) -> RetirementSummary | None:
    """Months-to-save toward a stated retirement target (income-based PV deferred)."""
    if Scenario.RETIREMENT not in scenarios:
        return None
    goal = _retirement_goal(profile)
    if goal is None or goal.target_amount <= 0.0:
        return None
    # A goal due now (under a month away) leaves no time to save monthly: report
    # the target with no ongoing contribution rather than failing the whole plan.
    if round(goal.horizon_years * MONTHS_PER_YEAR) < 1:
        return RetirementSummary(
            capital_needed=goal.target_amount, required_monthly_contribution=0.0
        )
    monthly = required_contribution(goal.target_amount, initial, annual_mean, goal.horizon_years)
    return RetirementSummary(
        capital_needed=goal.target_amount,
        required_monthly_contribution=monthly,
    )
