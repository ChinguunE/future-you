"""Schema-validation tests for the snapshot models (Phase 2, DATA.md).

Proves the contract is strict where it must be: unknown fields are rejected, the
ISIN / domicile / currency formats are enforced, a fund and a stock can't be
confused, the screen status stays self-consistent, and the CMA correlation
matrix must be square, symmetric, unit-diagonal and in range.
"""

from datetime import date

import pytest
from pydantic import ValidationError

from app.snapshots.schemas import (
    CMA,
    AssetClass,
    AssetClassAssumption,
    BilingualText,
    Citation,
    Content,
    DistributionPolicy,
    FundFacts,
    GlossaryTerm,
    Instrument,
    InstrumentKind,
    MarketQuote,
    Replication,
    Role,
    ScreenStatus,
    StockFacts,
    Universe,
)

# --- Fixtures (tiny but valid building blocks) -----------------------------

_CITE = Citation(
    source="iShares CSPX factsheet", url="https://example.com/cspx", as_of=date(2026, 6, 1)
)
_QUOTE = MarketQuote(price=500.0, currency="CHF", as_of=date(2026, 6, 1), citation=_CITE)


def _fund_facts(**over: object) -> FundFacts:
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


def _stock_facts(**over: object) -> StockFacts:
    base = dict(
        isin="CH0038863350",
        market_cap=300_000_000_000.0,
        beta=0.7,
        is_profitable=True,
        pays_dividend=True,
        first_trade_date=date(2000, 1, 3),
        is_index_member=True,
        index_name="SMI",
        citation=_CITE,
    )
    base.update(over)
    return StockFacts(**base)  # type: ignore[arg-type]


def _fund_instrument(**over: object) -> Instrument:
    base = dict(
        ticker="CSPX.SW",
        name="iShares Core S&P 500 UCITS ETF",
        kind=InstrumentKind.UCITS_FUND,
        asset_class=AssetClass.US_EQUITY,
        role=Role.CORE,
        exposure="S&P 500",
        market=_QUOTE,
        screen=ScreenStatus(passed=True),
        fund=_fund_facts(),
    )
    base.update(over)
    return Instrument(**base)  # type: ignore[arg-type]


# --- Strictness ------------------------------------------------------------


def test_unknown_field_rejected() -> None:
    with pytest.raises(ValidationError):
        Citation(  # type: ignore[call-arg]
            source="x", url="https://e.com", as_of=date(2026, 1, 1), bogus=1
        )


def test_citation_requires_http_url() -> None:
    with pytest.raises(ValidationError):
        Citation(source="x", url="ftp://e.com/file", as_of=date(2026, 1, 1))


def test_bilingual_requires_both_languages() -> None:
    with pytest.raises(ValidationError):
        BilingualText(en="hello")  # type: ignore[call-arg]


# --- Format validators -----------------------------------------------------


@pytest.mark.parametrize("bad", ["IE00B5BMR08", "ie00b5bmr087", "IE00B5BMR08X", "12345"])
def test_malformed_isin_rejected(bad: str) -> None:
    with pytest.raises(ValidationError):
        _fund_facts(isin=bad)


def test_domicile_must_be_alpha2() -> None:
    with pytest.raises(ValidationError):
        _fund_facts(domicile="IRL")


def test_currency_must_be_iso4217() -> None:
    with pytest.raises(ValidationError):
        MarketQuote(price=1.0, currency="Fr", as_of=date(2026, 1, 1), citation=_CITE)


def test_ter_ceiling_enforced() -> None:
    with pytest.raises(ValidationError):
        _fund_facts(ter=0.2)  # above the 5% sanity ceiling


# --- Screen status self-consistency ---------------------------------------


def test_passing_screen_cannot_carry_reasons() -> None:
    with pytest.raises(ValidationError):
        ScreenStatus(passed=True, reasons=("beta_too_high",))


def test_failing_screen_needs_a_reason() -> None:
    with pytest.raises(ValidationError):
        ScreenStatus(passed=False, reasons=())


# --- Instrument kind / facts coherence ------------------------------------


def test_fund_instrument_round_trips() -> None:
    inst = _fund_instrument()
    assert inst.fund is not None and inst.stock is None


def test_stock_instrument_round_trips() -> None:
    inst = Instrument(
        ticker="NESN.SW",
        name="Nestlé S.A.",
        kind=InstrumentKind.STOCK,
        asset_class=AssetClass.SWISS_EQUITY,
        role=Role.SATELLITE,
        exposure="Nestlé",
        market=_QUOTE,
        screen=ScreenStatus(passed=True),
        stock=_stock_facts(),
    )
    assert inst.stock is not None and inst.fund is None


def test_fund_kind_with_stock_facts_rejected() -> None:
    with pytest.raises(ValidationError):
        _fund_instrument(stock=_stock_facts(), fund=None)


def test_stock_kind_without_stock_facts_rejected() -> None:
    with pytest.raises(ValidationError):
        Instrument(
            ticker="AAPL",
            name="Apple Inc.",
            kind=InstrumentKind.STOCK,
            asset_class=AssetClass.US_EQUITY,
            role=Role.SATELLITE,
            exposure="Apple",
            market=_QUOTE,
            screen=ScreenStatus(passed=True),
            fund=_fund_facts(),  # wrong block for a stock
        )


def test_malformed_ticker_rejected() -> None:
    with pytest.raises(ValidationError):
        _fund_instrument(ticker="CSPX SW")  # space is illegal


# --- Universe --------------------------------------------------------------


def test_empty_universe_rejected() -> None:
    with pytest.raises(ValidationError):
        Universe(schema_version=1, generated_at=date(2026, 6, 1), instruments=())


def test_duplicate_tickers_rejected() -> None:
    with pytest.raises(ValidationError):
        Universe(
            schema_version=1,
            generated_at=date(2026, 6, 1),
            instruments=(_fund_instrument(), _fund_instrument()),
        )


# --- CMA -------------------------------------------------------------------


def _cma(correlation: tuple[tuple[float, ...], ...]) -> CMA:
    return CMA(
        schema_version=1,
        source=Citation(
            source="J.P. Morgan LTCMA 2026", url="https://e.com/ltcma", as_of=date(2025, 11, 1)
        ),
        base_currency="CHF",
        horizon_years=12,
        assumptions=(
            AssetClassAssumption(
                asset_class=AssetClass.WORLD_EQUITY, label="Global equity",
                expected_return=0.06, compound_return=0.0488, volatility=0.15,
            ),
            AssetClassAssumption(
                asset_class=AssetClass.GLOBAL_AGG_BONDS, label="Global bonds",
                expected_return=0.02, compound_return=0.0188, volatility=0.05,
            ),
        ),
        correlation=correlation,
    )


def test_valid_cma_builds() -> None:
    cma = _cma(((1.0, 0.2), (0.2, 1.0)))
    assert len(cma.assumptions) == 2


def test_non_square_correlation_rejected() -> None:
    with pytest.raises(ValidationError):
        _cma(((1.0, 0.2, 0.0), (0.2, 1.0, 0.0)))


def test_asymmetric_correlation_rejected() -> None:
    with pytest.raises(ValidationError):
        _cma(((1.0, 0.2), (0.3, 1.0)))


def test_non_unit_diagonal_rejected() -> None:
    with pytest.raises(ValidationError):
        _cma(((0.9, 0.2), (0.2, 1.0)))


def test_out_of_range_correlation_rejected() -> None:
    with pytest.raises(ValidationError):
        _cma(((1.0, 1.4), (1.4, 1.0)))


def test_duplicate_asset_class_rejected() -> None:
    with pytest.raises(ValidationError):
        CMA(
            schema_version=1,
            source=Citation(source="x", url="https://e.com", as_of=date(2025, 11, 1)),
            base_currency="CHF",
            horizon_years=12,
            assumptions=(
                AssetClassAssumption(
                    asset_class=AssetClass.WORLD_EQUITY, label="A",
                    expected_return=0.06, compound_return=0.0488, volatility=0.15,
                ),
                AssetClassAssumption(
                    asset_class=AssetClass.WORLD_EQUITY, label="B",
                    expected_return=0.05, compound_return=0.0402, volatility=0.14,
                ),
            ),
            correlation=((1.0, 0.2), (0.2, 1.0)),
        )


# --- Content ---------------------------------------------------------------


def test_content_rejects_duplicate_glossary_keys() -> None:
    term = GlossaryTerm(
        key="ter",
        term=BilingualText(en="TER", fr="TER"),
        definition=BilingualText(en="annual fee", fr="frais annuels"),
    )
    with pytest.raises(ValidationError):
        Content(schema_version=1, generated_at=date(2026, 6, 1), glossary=(term, term))
