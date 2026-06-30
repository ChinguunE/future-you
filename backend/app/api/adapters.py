"""Adapt between the HTTP models and the pure engine.

Three small, pure translations keep the route thin and testable:

* ``to_profile`` — the request profile into the engine's frozen ``Profile``.
* ``resolve_picks`` — requested tickers into engine ``Pick``s, resolved against
  the universe; tickers we don't carry are returned separately so the response
  can say "couldn't include X" rather than dropping it silently.
* ``to_response`` — a computed ``PlanResult`` into the JSON response shape
  (numbers + stable codes only). The projection cone is sampled yearly so the
  payload stays light without losing the shape.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import asdict

import numpy as np
from numpy.typing import NDArray

from app.api.schemas import (
    AllocationOut,
    AnalyticsOut,
    HoldingOut,
    IpsSectionOut,
    PickOut,
    PlanResponse,
    ProjectionBandsOut,
    ProjectionOut,
    RetirementOut,
    RiskOut,
    SleevesOut,
    ThreeAOut,
    TiltCostOut,
)
from app.api.schemas import ProfileIn as ProfileInModel
from app.snapshots.schemas import Instrument
from core.plan import Pick, PlanResult
from core.types import Goal, Profile

_MONTHS_PER_YEAR = 12


def to_profile(profile: ProfileInModel) -> Profile:
    """The request profile as the engine's frozen ``Profile``."""
    return Profile(
        age=profile.age,
        retirement_age=profile.retirement_age,
        dependents=profile.dependents,
        income_stability=profile.income_stability,
        emergency_fund_months=profile.emergency_fund_months,
        has_high_interest_debt=profile.has_high_interest_debt,
        goals=tuple(
            Goal(
                kind=g.kind,
                horizon_years=g.horizon_years,
                target_amount=g.target_amount,
                label=g.label,
            )
            for g in profile.goals
        ),
    )


def resolve_picks(
    tickers: Sequence[str], index: dict[str, Instrument]
) -> tuple[list[Pick], list[str]]:
    """Resolve requested tickers into engine picks; report any we don't carry.

    Duplicates are collapsed (a pick named twice is still one position). A stock
    carries its beta; a fund has none and is sized off its asset class instead.
    """
    resolved: list[Pick] = []
    excluded: list[str] = []
    seen: set[str] = set()
    for ticker in tickers:
        if ticker in seen:
            continue
        seen.add(ticker)
        inst = index.get(ticker)
        if inst is None:
            excluded.append(ticker)
            continue
        beta = inst.stock.beta if inst.stock is not None else None
        resolved.append(
            Pick(
                ticker=inst.ticker,
                name=inst.name,
                asset_class=inst.asset_class.value,
                beta=beta,
                screen_passed=inst.screen.passed,
                screen_reasons=tuple(inst.screen.reasons),
            )
        )
    return resolved, excluded


def _sample_yearly(values: NDArray[np.float64], indices: Sequence[int]) -> list[float]:
    return [float(values[i]) for i in indices]


def to_response(plan: PlanResult, *, excluded: Sequence[str], as_of: str) -> PlanResponse:
    """A computed plan as the JSON response (cone sampled yearly)."""
    months = plan.cone.months
    indices = list(range(0, len(months), _MONTHS_PER_YEAR))
    if indices and indices[-1] != len(months) - 1:
        indices.append(len(months) - 1)

    picks = [
        PickOut(
            ticker=d.ticker,
            name=d.name,
            weight=d.weight,
            cap=d.cap,
            note_code=d.note_code,
            screen_passed=d.screen_passed,
            screen_reasons=list(d.screen_reasons),
        )
        for d in plan.picks
    ]
    picks += [
        PickOut(
            ticker=ticker,
            name=ticker,
            weight=0.0,
            cap=0.0,
            note_code="excluded_not_in_universe",
            screen_passed=False,
            screen_reasons=[],
        )
        for ticker in excluded
    ]

    return PlanResponse(
        as_of=as_of,
        horizon_years=plan.horizon_years,
        seed=plan.seed,
        risk=RiskOut(
            willingness=plan.risk.willingness,
            ability=plan.risk.ability,
            score=plan.risk.score,
            band=plan.risk.band.value,
            adjusted_score=plan.adjusted_score,
            effective_band=plan.effective_band.value,
        ),
        scenarios=sorted(s.value for s in plan.scenarios),
        allocation=AllocationOut(
            sleeves=SleevesOut(**plan.sleeves._asdict()),
            holdings=[
                HoldingOut(
                    ticker=h.ticker,
                    name=h.name,
                    asset_class=h.asset_class,
                    role=h.role,
                    weight=h.weight,
                    is_satellite=h.is_satellite,
                    cap=h.cap,
                    risk_contribution=h.risk_contribution,
                )
                for h in plan.holdings
            ],
            core_weight=plan.core_weight,
            satellite_weight=plan.satellite_weight,
        ),
        tilt_cost=TiltCostOut(**plan.tilt_cost._asdict()),
        picks=picks,
        projection=ProjectionOut(
            bands=ProjectionBandsOut(
                months=[int(months[i]) for i in indices],
                p10=_sample_yearly(plan.cone.bands["p10"], indices),
                p50=_sample_yearly(plan.cone.bands["p50"], indices),
                p90=_sample_yearly(plan.cone.bands["p90"], indices),
            ),
            median_terminal=plan.projection.median_terminal,
            low_terminal=plan.projection.low_terminal,
            high_terminal=plan.projection.high_terminal,
            goal_funding_probability=plan.projection.goal_funding_probability,
        ),
        analytics=AnalyticsOut(**asdict(plan.analytics)),
        retirement=(
            RetirementOut(**plan.retirement._asdict()) if plan.retirement is not None else None
        ),
        three_a=ThreeAOut(**plan.three_a._asdict()),
        ips=[IpsSectionOut(key=s.key, fields=dict(s.fields)) for s in plan.ips.sections],
    )
