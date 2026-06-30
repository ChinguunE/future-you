"""The composite ``POST /plan`` route.

This is the one compute endpoint: it adapts the request into engine inputs, runs
the whole pipeline via ``core.plan.build_plan`` over the committed snapshots, and
serialises the result. It stays thin — no finance maths here, and no data
provider is called at request time (the snapshots are read from the cache).
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api import data
from app.api.adapters import resolve_picks, to_profile, to_response
from app.api.schemas import PlanRequest, PlanResponse
from core.plan import build_plan

router = APIRouter()


@router.post("/plan", response_model=PlanResponse)
def create_plan(request: PlanRequest) -> PlanResponse:
    """Compute a full, personalised plan from the profile, quiz, money, and picks."""
    index = data.universe_index()
    resolved, excluded = resolve_picks(request.picks, index)

    plan = build_plan(
        profile=to_profile(request.profile),
        risk_answers=request.risk_answers,
        picks=resolved,
        core_funds=data.core_funds(),
        market=data.market_assumptions(),
        initial=request.money.initial,
        monthly_contribution=request.money.monthly_contribution,
        pillar_3a_limit=data.PILLAR_3A_LIMIT_CHF,
        annual_budget=request.money.annual_budget,
    )
    return to_response(plan, excluded=excluded, as_of=data.universe().generated_at.isoformat())
