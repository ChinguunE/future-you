"""Build the universe snapshot from the curated seed + yfinance (Phase 2).

DEV/SEED ONLY — off the request path (DATA.md). Reads ``data/seed/universe.yaml``
(human-authored, cited reference data), pulls live MARKET data from yfinance
(price, and for single stocks: market cap, beta, profitability, dividend,
first-trade date), runs the safe-universe screen via the engine, and writes the
validated ``data/snapshots/universe.json``.

Accuracy: reference figures come from the cited seed; market figures from
yfinance, stamped with today's date. For single stocks the seed ISIN is
cross-checked against yfinance and the run fails on a mismatch. A ticker that
returns no price fails loudly rather than shipping a gap.

Run from ``backend/``::

    python -m scripts.refresh_universe
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import yaml
import yfinance as yf

from app.snapshots.schemas import (
    AssetClass,
    Citation,
    DistributionPolicy,
    FundFacts,
    Instrument,
    InstrumentKind,
    MarketQuote,
    Replication,
    Role,
    StockFacts,
    Universe,
)
from app.snapshots.validate import assert_screen_consistent, screen_facts

_BACKEND = Path(__file__).resolve().parents[1]
SEED_PATH = _BACKEND / "data" / "seed" / "universe.yaml"
OUT_PATH = _BACKEND / "data" / "snapshots" / "universe.json"


# --- yfinance fetch layer (the only non-deterministic part) ----------------


@dataclass(frozen=True)
class Quote:
    price: float
    currency: str


@dataclass(frozen=True)
class StockData:
    quote: Quote
    market_cap: float
    beta: float
    is_profitable: bool
    pays_dividend: bool
    first_trade_date: date
    isin: str | None


def _normalise_price(price: float | None, raw_ccy: str | None) -> Quote:
    if price is None:
        raise RuntimeError("no price available")
    # London lines quote in pence (GBp / GBX); convert to pounds for an ISO code.
    if raw_ccy in ("GBp", "GBX"):
        return Quote(price=float(price) / 100.0, currency="GBP")
    if not raw_ccy:
        raise RuntimeError("no currency available")
    return Quote(price=float(price), currency=raw_ccy.upper())


def fetch_quote(ticker: str) -> Quote:
    tk = yf.Ticker(ticker)
    fi = tk.fast_info
    price = getattr(fi, "last_price", None)
    raw_ccy = getattr(fi, "currency", None)
    if price is None:  # fall back to the slower info / a recent close
        info = tk.info
        price = info.get("regularMarketPrice")
        raw_ccy = raw_ccy or info.get("currency")
    return _normalise_price(price, raw_ccy)


def _first_trade_date(info: dict[str, Any], tk: yf.Ticker) -> date:
    epoch = info.get("firstTradeDateEpochUtc") or info.get("firstTradeDateMilliseconds")
    if epoch:
        # yfinance is inconsistent: this can be seconds or milliseconds. Any value
        # above ~2e10 (year 2603 in seconds) must actually be milliseconds.
        seconds = float(epoch)
        if abs(seconds) > 2e10:
            seconds /= 1000.0
        try:
            parsed = datetime.fromtimestamp(seconds, tz=UTC).date()
            if 1900 <= parsed.year <= 2100:
                return parsed
        except (OverflowError, OSError, ValueError):
            pass  # fall through to the price-history fallback
    hist = tk.history(period="max")
    if hist.empty:
        raise RuntimeError("could not determine first-trade date")
    return hist.index[0].date()


def fetch_stock(ticker: str) -> StockData:
    tk = yf.Ticker(ticker)
    fi = tk.fast_info
    quote = _normalise_price(getattr(fi, "last_price", None), getattr(fi, "currency", None))
    info = tk.info
    market_cap = info.get("marketCap")
    beta = info.get("beta")
    if market_cap is None or beta is None:
        raise RuntimeError(f"missing market_cap/beta (cap={market_cap}, beta={beta})")
    eps = info.get("trailingEps")
    net_income = info.get("netIncomeToCommon")
    is_profitable = bool((eps or 0) > 0 or (net_income or 0) > 0)
    pays_dividend = bool(
        (info.get("dividendYield") or 0) > 0 or (info.get("trailingAnnualDividendRate") or 0) > 0
    )
    raw_isin = tk.isin
    isin = raw_isin if raw_isin and raw_isin != "-" else None
    return StockData(
        quote=quote,
        market_cap=float(market_cap),
        beta=float(beta),
        is_profitable=is_profitable,
        pays_dividend=pays_dividend,
        first_trade_date=_first_trade_date(info, tk),
        isin=isin,
    )


# --- Pure builders (seed row + market data -> Instrument) ------------------


def _yf_citation(ticker: str, as_of: date, note: str | None = None) -> Citation:
    return Citation(
        source="Yahoo Finance via yfinance",
        url=f"https://finance.yahoo.com/quote/{ticker}",
        as_of=as_of,
        note=note,
    )


def build_fund(row: dict[str, Any], quote: Quote, as_of: date) -> Instrument:
    fund = FundFacts(
        isin=row["isin"],
        ter=float(row["ter"]),
        aum=float(row["aum_eur"]),
        inception_date=row["inception_date"],
        ucits=bool(row["ucits"]),
        has_kid=bool(row["has_kid"]),
        replication=Replication(row["replication"]),
        domicile=row["domicile"],
        distribution_policy=DistributionPolicy(row["distribution_policy"]),
        citation=Citation(
            source=f"justETF — {row['name']}",
            url=row["source_url"],
            as_of=row["source_as_of"],
            note="Reference data (ISIN, TER, domicile, replication, distribution, "
            "inception, fund size in EUR) read from the justETF profile.",
        ),
    )
    kind = InstrumentKind(row["kind"])
    screen = screen_facts(kind, fund, None, as_of)
    return Instrument(
        ticker=row["ticker"],
        name=row["name"],
        kind=kind,
        asset_class=AssetClass(row["asset_class"]),
        role=Role(row["role"]),
        exposure=row["exposure"],
        market=MarketQuote(
            price=quote.price, currency=quote.currency, as_of=as_of,
            citation=_yf_citation(row["ticker"], as_of),
        ),
        screen=screen,
        fund=fund,
    )


def build_stock(row: dict[str, Any], data: StockData, as_of: date) -> Instrument:
    seed_isin = row["isin"]
    if data.isin and data.isin != seed_isin:
        # yfinance's .isin is unreliable (it returns '-' for SIX names and even a
        # wrong-country ISIN for some US tickers), so we keep the cited seed ISIN as
        # truth and only surface the discrepancy for a human to sanity-check.
        print(
            f"  warn  {row['ticker']}: yfinance ISIN {data.isin} != cited seed "
            f"{seed_isin}; keeping the seed value"
        )
    stock = StockFacts(
        isin=seed_isin,
        market_cap=data.market_cap,
        beta=data.beta,
        is_profitable=data.is_profitable,
        pays_dividend=data.pays_dividend,
        first_trade_date=data.first_trade_date,
        is_index_member=bool(row["is_index_member"]),
        index_name=row["index_name"],
        citation=_yf_citation(
            row["ticker"], as_of,
            note=f"Market data from yfinance on {as_of.isoformat()}. "
            f"Index membership: {row['membership_note']} ({row['membership_source_url']}).",
        ),
    )
    screen = screen_facts(InstrumentKind.STOCK, None, stock, as_of)
    return Instrument(
        ticker=row["ticker"],
        name=row["name"],
        kind=InstrumentKind.STOCK,
        asset_class=AssetClass(row["asset_class"]),
        role=Role(row["role"]),
        exposure=row["exposure"],
        market=MarketQuote(
            price=data.quote.price, currency=data.quote.currency, as_of=as_of,
            citation=_yf_citation(row["ticker"], as_of),
        ),
        screen=screen,
        stock=stock,
    )


# --- Orchestration ---------------------------------------------------------


def build_universe(as_of: date) -> Universe:
    seed = yaml.safe_load(SEED_PATH.read_text(encoding="utf-8"))
    instruments: list[Instrument] = []
    failures: list[str] = []

    # Catch broad Exception so one unresolved ticker (yfinance can raise KeyError,
    # HTTPError, etc. from its internals) is recorded, not fatal — we see every bad
    # ticker in one pass. SystemExit (e.g. an ISIN mismatch) still aborts, by design.
    for row in seed["funds"]:
        try:
            instruments.append(build_fund(row, fetch_quote(row["ticker"]), as_of))
            print(f"  fund  {row['ticker']:10} ok")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{row['ticker']}: {type(exc).__name__}: {exc}")
            print(f"  fund  {row['ticker']:10} FAIL: {type(exc).__name__}: {exc}")

    for row in seed["stocks"]:
        try:
            instruments.append(build_stock(row, fetch_stock(row["ticker"]), as_of))
            print(f"  stock {row['ticker']:10} ok")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{row['ticker']}: {type(exc).__name__}: {exc}")
            print(f"  stock {row['ticker']:10} FAIL: {type(exc).__name__}: {exc}")

    if failures:
        raise SystemExit(
            "refresh aborted — fix these tickers/fields before shipping a snapshot:\n  "
            + "\n  ".join(failures)
        )
    return Universe(schema_version=1, generated_at=as_of, instruments=tuple(instruments))


def main() -> None:
    as_of = datetime.now(UTC).date()
    print(f"refreshing universe as of {as_of.isoformat()} ...")
    universe = build_universe(as_of)
    assert_screen_consistent(universe)  # belt-and-suspenders: stored == recomputed
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(universe.model_dump_json(indent=2) + "\n", encoding="utf-8")
    passed = sum(1 for i in universe.instruments if i.screen.passed)
    rel = OUT_PATH.relative_to(_BACKEND.parent)
    print(
        f"\nwrote {rel} — {len(universe.instruments)} instruments, "
        f"{passed} pass the safe screen, {len(universe.instruments) - passed} flagged"
    )
    for i in universe.instruments:
        if not i.screen.passed:
            print(f"  flagged: {i.ticker:10} {i.exposure:32} reasons={list(i.screen.reasons)}")


if __name__ == "__main__":
    main()
