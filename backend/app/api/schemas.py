"""Request and response models for the API (Pydantic v2).

The *request* models validate and bound everything the client sends (the profile,
the risk-quiz answers, the money inputs, and the picks) before it ever reaches the
engine — malformed input is rejected here with a clear 422, never deep in the
maths. Goal kinds reuse the engine's ``GoalKind`` so the allowed values stay in
lockstep with ``core/``.

The *response* models are the JSON shape of a computed plan: numbers, stable codes
(risk bands, scenarios, pick ``note_code``s, screen reasons), and real instrument
names only — no prose. The bilingual UI renders headings and explanations from the
codes, so nothing language-specific is baked into the payload. The router builds
these from a ``core.plan.PlanResult``; this module only defines the contract.
"""

from __future__ import annotations

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

from app.snapshots.schemas import Concept, GlossaryTerm, Instrument, InstrumentContent
from core.types import GoalKind

# Risk-quiz answers: a non-empty list of Likert values, each 1–5 (METHODOLOGY §6).
RiskAnswers = Annotated[
    list[Annotated[int, Field(ge=1, le=5)]],
    Field(min_length=1, max_length=30),
]


class _Strict(BaseModel):
    """Reject unknown fields so client typos fail loudly instead of silently."""

    model_config = ConfigDict(extra="forbid")


# --- Request ---------------------------------------------------------------


class GoalIn(_Strict):
    """One thing the user is saving toward."""

    kind: GoalKind
    horizon_years: float = Field(ge=0.0, le=100.0)
    target_amount: float = Field(default=0.0, ge=0.0)
    label: str = Field(default="", max_length=120)


class ProfileIn(_Strict):
    """Who the user is — drives risk ability and adaptive scenarios."""

    age: int = Field(ge=0, le=120)
    retirement_age: int = Field(default=65, ge=0, le=120)
    dependents: int = Field(default=0, ge=0, le=20)
    income_stability: float = Field(default=1.0, ge=0.0, le=1.0)
    emergency_fund_months: float = Field(default=0.0, ge=0.0, le=120.0)
    has_high_interest_debt: bool = False
    goals: list[GoalIn] = Field(default_factory=list, max_length=20)


class MoneyIn(_Strict):
    """The starting pot and the saving habit that feed the projection."""

    initial: float = Field(ge=0.0)
    monthly_contribution: float = Field(ge=0.0)
    annual_budget: float | None = Field(default=None, ge=0.0)


class PlanRequest(_Strict):
    """Everything needed to compute a plan — rides in the body and the URL hash."""

    profile: ProfileIn
    risk_answers: RiskAnswers
    money: MoneyIn
    picks: list[str] = Field(default_factory=list, max_length=20)


# --- Response --------------------------------------------------------------


class RiskOut(_Strict):
    willingness: float
    ability: float
    score: float
    band: str  # appetite band
    adjusted_score: float  # after the horizon glide-path cap
    effective_band: str  # the band the mix is actually built at


class SleevesOut(_Strict):
    equity: float
    bond: float
    cash: float
    diversifier: float


class HoldingOut(_Strict):
    ticker: str
    name: str
    asset_class: str
    role: str  # "core" | "satellite"
    weight: float
    is_satellite: bool
    cap: float | None
    risk_contribution: float


class AllocationOut(_Strict):
    sleeves: SleevesOut
    holdings: list[HoldingOut]
    core_weight: float
    satellite_weight: float


class PickOut(_Strict):
    """One requested pick's disposition — included, bounded, and explained."""

    ticker: str
    name: str
    weight: float
    cap: float
    # One of: included_at_full_weight, reduced_for_risk, capped_at_hard_limit,
    # reduced_for_sleeve_budget. The UI renders the bilingual explanation.
    note_code: str
    screen_passed: bool
    screen_reasons: list[str]


class TiltCostOut(_Strict):
    optimal_return: float
    tilted_return: float
    optimal_risk: float
    tilted_risk: float
    optimal_sharpe: float
    tilted_sharpe: float


class ProjectionBandsOut(_Strict):
    months: list[int]
    p10: list[float]
    p50: list[float]
    p90: list[float]


class ProjectionOut(_Strict):
    bands: ProjectionBandsOut
    median_terminal: float
    low_terminal: float
    high_terminal: float
    goal_funding_probability: float


class AnalyticsOut(_Strict):
    expected_return: float
    volatility: float
    sharpe: float
    value_at_risk_monthly: float
    conditional_var_monthly: float
    worst_year_loss: float


class RetirementOut(_Strict):
    capital_needed: float
    required_monthly_contribution: float


class ThreeAOut(_Strict):
    pillar_3a: float
    taxable: float


class IpsSectionOut(_Strict):
    key: str
    fields: dict[str, Any]


class PlanResponse(_Strict):
    """The whole computed plan, as JSON."""

    as_of: str
    horizon_years: float
    seed: int
    risk: RiskOut
    scenarios: list[str]
    allocation: AllocationOut
    tilt_cost: TiltCostOut
    picks: list[PickOut]
    projection: ProjectionOut
    analytics: AnalyticsOut
    retirement: RetirementOut | None
    three_a: ThreeAOut
    ips: list[IpsSectionOut]


# --- Snapshot reads (GET) --------------------------------------------------


class AssetDetail(_Strict):
    """One instrument: its facts (universe) joined with its prose (content)."""

    instrument: Instrument
    content: InstrumentContent | None


class LearnContent(_Strict):
    """The Learn surface: glossary terms + concept and Switzerland explainers."""

    schema_version: int
    generated_at: str
    glossary: tuple[GlossaryTerm, ...]
    concepts: tuple[Concept, ...]
    switzerland: tuple[Concept, ...]
