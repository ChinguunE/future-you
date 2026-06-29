"""Shared builders for snapshot tests — tiny, valid objects to mutate per case."""

from __future__ import annotations

from datetime import date

from app.snapshots.schemas import (
    CMA,
    AssetClass,
    AssetClassAssumption,
    Citation,
    DistributionPolicy,
    FundFacts,
    Instrument,
    InstrumentKind,
    MarketQuote,
    Replication,
    Role,
    ScreenStatus,
    StockFacts,
    Universe,
)

GENERATED_AT = date(2026, 6, 1)
_CITE = Citation(source="factsheet", url="https://example.com/x", as_of=date(2026, 6, 1))
_QUOTE = MarketQuote(price=100.0, currency="CHF", as_of=date(2026, 6, 1), citation=_CITE)


def fund_facts(**over: object) -> FundFacts:
    base = dict(
        isin="IE00B5BMR087",
        ter=0.0007,
        aum=80_000_000_000.0,
        inception_date=date(2010, 5, 19),
        ucits=True,
        has_kid=True,
        replication=Replication.PHYSICAL,
        domicile="IE",
        distribution_policy=DistributionPolicy.ACCUMULATING,
        citation=_CITE,
    )
    base.update(over)
    return FundFacts(**base)  # type: ignore[arg-type]


def stock_facts(**over: object) -> StockFacts:
    base = dict(
        isin="US67066G1040",
        market_cap=1_000_000_000_000.0,
        beta=1.7,  # NVIDIA-like: fails the safe screen on beta
        is_profitable=True,
        pays_dividend=True,
        first_trade_date=date(1999, 1, 22),
        is_index_member=True,
        index_name="S&P 500",
        citation=_CITE,
    )
    base.update(over)
    return StockFacts(**base)  # type: ignore[arg-type]


def fund_instrument(**over: object) -> Instrument:
    base = dict(
        ticker="CSPX.SW",
        name="iShares Core S&P 500 UCITS ETF",
        kind=InstrumentKind.UCITS_FUND,
        asset_class=AssetClass.US_EQUITY,
        role=Role.CORE,
        exposure="S&P 500",
        market=_QUOTE,
        screen=ScreenStatus(passed=True),
        fund=fund_facts(),
    )
    base.update(over)
    return Instrument(**base)  # type: ignore[arg-type]


def stock_instrument(**over: object) -> Instrument:
    base = dict(
        ticker="NVDA",
        name="NVIDIA Corporation",
        kind=InstrumentKind.STOCK,
        asset_class=AssetClass.US_EQUITY,
        role=Role.SATELLITE,
        exposure="NVIDIA",
        market=_QUOTE,
        screen=ScreenStatus(passed=False, reasons=("beta_too_high",)),
        stock=stock_facts(),
    )
    base.update(over)
    return Instrument(**base)  # type: ignore[arg-type]


def universe(*instruments: Instrument) -> Universe:
    insts = instruments or (fund_instrument(), stock_instrument())
    return Universe(schema_version=1, generated_at=GENERATED_AT, instruments=insts)


def cma(
    *,
    classes: tuple[AssetClass, ...] = (AssetClass.WORLD_EQUITY, AssetClass.GLOBAL_AGG_BONDS),
    correlation: tuple[tuple[float, ...], ...] = ((1.0, 0.2), (0.2, 1.0)),
    returns: tuple[float, ...] = (0.06, 0.02),
    vols: tuple[float, ...] = (0.15, 0.05),
) -> CMA:
    assumptions = tuple(
        AssetClassAssumption(
            asset_class=c, label=c.value.replace("_", " ").title(),
            expected_return=r, compound_return=r - 0.5 * v * v, volatility=v,
        )
        for c, r, v in zip(classes, returns, vols, strict=True)
    )
    return CMA(
        schema_version=1,
        source=Citation(
            source="J.P. Morgan LTCMA 2026 (CHF)", url="https://e.com", as_of=date(2025, 11, 1)
        ),
        base_currency="CHF",
        horizon_years=12,
        assumptions=assumptions,
        correlation=correlation,
    )
