"""Cached snapshot access + the engine inputs derived from it.

The snapshot loaders re-read and re-validate the JSON on every call, so the
request path wraps them in process-lifetime caches (the committed snapshots are
static). This module also turns the snapshots into the plain inputs the engine
wants — the capital-market assumptions, the clean 4-fund core, and a
ticker→instrument index for resolving picks and serving per-asset reads.
"""

from __future__ import annotations

from functools import lru_cache

from app.snapshots.loader import load_cma, load_content, load_universe
from app.snapshots.schemas import CMA, Content, Instrument, InstrumentContent, Universe
from core.plan import AssetClassView, CoreFund, MarketAssumptions

# The dated Swiss pillar-3a employee cap (SWITZERLAND §2): CHF 7,258 for 2026.
# Supplied by the app, not hard-coded in the engine — refresh annually.
PILLAR_3A_LIMIT_CHF = 7258.0

# The clean 4-fund global core — one diversified fund per strategic sleeve. The
# rest of the universe powers asset research and the satellite picks list.
CORE_FUND_TICKERS: dict[str, str] = {
    "equity": "VWCE.DE",
    "bond": "AGGS.SW",
    "cash": "CSBGC3.SW",
    "diversifier": "SGLN.L",
}


@lru_cache(maxsize=1)
def universe() -> Universe:
    return load_universe()


@lru_cache(maxsize=1)
def cma() -> CMA:
    return load_cma()


@lru_cache(maxsize=1)
def content() -> Content:
    return load_content()


@lru_cache(maxsize=1)
def universe_index() -> dict[str, Instrument]:
    """A ticker→instrument map so per-asset lookups don't scan the whole list."""
    return {inst.ticker: inst for inst in universe().instruments}


@lru_cache(maxsize=1)
def content_index() -> dict[str, InstrumentContent]:
    """A ticker→prose map for joining facts with their plain-language layer."""
    return {item.ticker: item for item in content().instruments}


@lru_cache(maxsize=1)
def market_assumptions() -> MarketAssumptions:
    """The CMA as engine inputs (views aligned to the correlation-matrix order)."""
    snapshot = cma()
    views = tuple(
        AssetClassView(
            asset_class=a.asset_class.value,
            expected_return=a.expected_return,
            compound_return=a.compound_return,
            volatility=a.volatility,
        )
        for a in snapshot.assumptions
    )
    return MarketAssumptions(views=views, correlation=snapshot.correlation)


@lru_cache(maxsize=1)
def core_funds() -> tuple[CoreFund, ...]:
    """The four core funds, resolved against the universe for name + asset class."""
    index = universe_index()
    funds: list[CoreFund] = []
    for sleeve, ticker in CORE_FUND_TICKERS.items():
        inst = index.get(ticker)
        if inst is None:
            raise RuntimeError(f"core fund {ticker!r} is missing from the universe snapshot")
        funds.append(
            CoreFund(
                sleeve=sleeve,
                ticker=inst.ticker,
                name=inst.name,
                asset_class=inst.asset_class.value,
            )
        )
    return tuple(funds)
