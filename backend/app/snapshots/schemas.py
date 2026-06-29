"""Typed schemas for the committed JSON snapshots (Phase 2, DATA.md).

These pydantic models are the *contract* the refresh scripts must produce and the
API reads back. They are deliberately strict — ``extra="forbid"`` everywhere — so
a typo or a stray field fails loudly at load time rather than silently shipping
wrong data. Three snapshots are modelled:

* :class:`Universe` — the screened instrument list. Each row carries exactly the
  facts :mod:`core.screen` needs (so the whole universe can be gated through it),
  plus the cited reference data (ISIN, TER, domicile, distribution policy) and a
  market quote.
* :class:`CMA` — the capital-market assumptions (per-asset-class expected return,
  volatility, and a correlation matrix) that feed the optimiser. Shaped to drop
  straight into :func:`core.moments.corr_to_cov`.
* :class:`Content` — the bilingual (EN/FR) glossary, concept explainers, the
  Swiss "how to invest" sections, and a plain description + risk note per
  instrument. Every figure traces to a :class:`Citation`.

Accuracy rule (DATA.md): no number is ever invented. Reference fields are
curated-and-cited; market fields come from the snapshot provider. Each block that
asserts a figure carries the :class:`Citation` it came from.
"""

from __future__ import annotations

import re
from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

__all__ = [
    "AssetClass",
    "InstrumentKind",
    "Role",
    "DistributionPolicy",
    "Replication",
    "Citation",
    "BilingualText",
    "ScreenStatus",
    "FundFacts",
    "StockFacts",
    "MarketQuote",
    "Instrument",
    "Universe",
    "AssetClassAssumption",
    "CMA",
    "GlossaryTerm",
    "Concept",
    "InstrumentContent",
    "Content",
]

_ISIN_RE = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$")
_TICKER_RE = re.compile(r"^[A-Z0-9]+([.\-][A-Z0-9]+)*$")


class _Strict(BaseModel):
    """Base for every snapshot model: reject unknown fields, no silent coercion."""

    model_config = ConfigDict(extra="forbid", frozen=True)


# --- Enumerations ---------------------------------------------------------


class AssetClass(StrEnum):
    """The strategic building blocks. Every universe row maps to one of these,
    and the CMA snapshot must supply an assumption row for each one used."""

    WORLD_EQUITY = "world_equity"  # developed all-world / MSCI World-style
    US_EQUITY = "us_equity"
    EUROPE_EQUITY = "europe_equity"
    SWISS_EQUITY = "swiss_equity"
    JAPAN_EQUITY = "japan_equity"
    PACIFIC_EX_JAPAN_EQUITY = "pacific_ex_japan_equity"
    EM_EQUITY = "em_equity"
    WORLD_SMALL_CAP = "world_small_cap"
    GLOBAL_AGG_BONDS = "global_agg_bonds"  # global investment-grade, CHF-hedged
    SWISS_BONDS = "swiss_bonds"
    CASH_CHF = "cash_chf"
    GOLD = "gold"


class InstrumentKind(StrEnum):
    """Structure of the instrument — drives which screen and facts apply."""

    UCITS_FUND = "ucits_fund"  # an ETF carrying a KID; the fund screen applies
    ETC = "etc"  # physically-backed commodity note (gold); the ETC screen applies
    STOCK = "stock"  # a single company; the stock screen applies


class Role(StrEnum):
    """How the instrument is used in a plan (METHODOLOGY §7)."""

    CORE = "core"  # diversified backbone
    SATELLITE = "satellite"  # a capped single-name pick (the NVIDIA flow)
    DIVERSIFIER = "diversifier"  # the small diversifier sleeve (gold)
    CASH = "cash"  # the cash / near-cash sleeve


class DistributionPolicy(StrEnum):
    ACCUMULATING = "accumulating"
    DISTRIBUTING = "distributing"
    NONE = "none"  # e.g. a commodity ETC pays nothing


class Replication(StrEnum):
    PHYSICAL = "physical"
    PHYSICAL_SAMPLING = "physical_sampling"
    SYNTHETIC = "synthetic"
    NA = "na"  # not applicable (a single stock)


# --- Shared value objects -------------------------------------------------


class Citation(_Strict):
    """Where a figure (or a block of figures) came from, and as of when."""

    source: str = Field(min_length=2)  # e.g. "iShares CSPX factsheet", "yfinance"
    url: str = Field(min_length=4)
    as_of: date
    note: str | None = None

    @field_validator("url")
    @classmethod
    def _url_scheme(cls, v: str) -> str:
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("citation url must be an http(s) link")
        return v


class BilingualText(_Strict):
    """A string in both supported languages (next-intl EN/FR). Both required —
    nothing ships single-language."""

    en: str = Field(min_length=1)
    fr: str = Field(min_length=1)


class ScreenStatus(_Strict):
    """The safe-universe screen outcome, mirroring ``core.screen.ScreenResult``.

    Stored in the snapshot so the API need not recompute; a validation test
    recomputes it from the facts below and asserts it matches (no drift)."""

    passed: bool
    reasons: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _consistent(self) -> ScreenStatus:
        if self.passed and self.reasons:
            raise ValueError("a passing screen must have no reasons")
        if not self.passed and not self.reasons:
            raise ValueError("a failing screen must list at least one reason")
        return self


# --- Per-instrument facts -------------------------------------------------


class FundFacts(_Strict):
    """Cited reference data for a fund or ETC — what ``screen_fund`` / ``screen_etc``
    read, plus the fields the UI shows. From the issuer/justETF factsheet."""

    isin: str
    ter: float = Field(ge=0.0, le=0.05)  # 5% sanity ceiling; the screen caps at 0.5%
    aum: float = Field(ge=0.0)
    inception_date: date
    ucits: bool
    has_kid: bool
    replication: Replication
    domicile: str  # ISO-3166 alpha-2
    distribution_policy: DistributionPolicy
    citation: Citation

    @field_validator("isin")
    @classmethod
    def _isin_format(cls, v: str) -> str:
        if not _ISIN_RE.match(v):
            raise ValueError(f"malformed ISIN: {v!r}")
        return v

    @field_validator("domicile")
    @classmethod
    def _domicile_format(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{2}$", v):
            raise ValueError(f"domicile must be an ISO alpha-2 code, got {v!r}")
        return v


class StockFacts(_Strict):
    """Cited facts for a single company — what ``screen_stock`` reads. ``years_listed``
    is derived from ``first_trade_date`` against the universe's ``generated_at``."""

    isin: str | None = None
    market_cap: float = Field(gt=0.0)
    beta: float
    is_profitable: bool
    pays_dividend: bool
    first_trade_date: date
    is_index_member: bool
    index_name: str = Field(min_length=2)
    citation: Citation

    @field_validator("isin")
    @classmethod
    def _isin_format(cls, v: str | None) -> str | None:
        if v is not None and not _ISIN_RE.match(v):
            raise ValueError(f"malformed ISIN: {v!r}")
        return v


class MarketQuote(_Strict):
    """The latest price for the instrument, with its source and as-of date."""

    price: float = Field(gt=0.0)
    currency: str
    as_of: date
    citation: Citation

    @field_validator("currency")
    @classmethod
    def _currency_format(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{3}$", v):
            raise ValueError(f"currency must be an ISO 4217 code, got {v!r}")
        return v


class Instrument(_Strict):
    """One row of the screened universe: a core fund, a diversifier ETC, or a
    single-name satellite stock. Exactly one of ``fund`` / ``stock`` is present,
    matching ``kind``."""

    ticker: str  # yfinance ticker incl. exchange suffix, e.g. "CSPX.SW", "NESN.SW"
    name: str = Field(min_length=2)
    kind: InstrumentKind
    asset_class: AssetClass
    role: Role
    exposure: str = Field(min_length=2)  # short display label, e.g. "S&P 500"
    market: MarketQuote
    screen: ScreenStatus
    fund: FundFacts | None = None
    stock: StockFacts | None = None

    @field_validator("ticker")
    @classmethod
    def _ticker_format(cls, v: str) -> str:
        if not _TICKER_RE.match(v):
            raise ValueError(f"malformed ticker: {v!r}")
        return v

    @model_validator(mode="after")
    def _facts_match_kind(self) -> Instrument:
        is_stock = self.kind is InstrumentKind.STOCK
        if is_stock:
            if self.stock is None or self.fund is not None:
                raise ValueError("a stock must carry stock facts and no fund facts")
        else:  # UCITS_FUND or ETC
            if self.fund is None or self.stock is not None:
                raise ValueError(f"a {self.kind} must carry fund facts and no stock facts")
        return self


class Universe(_Strict):
    """The committed, screened instrument list."""

    schema_version: int = Field(ge=1)
    generated_at: date  # the snapshot's as-of; ``years_listed`` is measured from here
    instruments: tuple[Instrument, ...]

    @model_validator(mode="after")
    def _non_empty_unique(self) -> Universe:
        if not self.instruments:
            raise ValueError("the universe must not be empty")
        tickers = [i.ticker for i in self.instruments]
        if len(tickers) != len(set(tickers)):
            raise ValueError("duplicate tickers in the universe")
        return self


# --- Capital-market assumptions -------------------------------------------


class AssetClassAssumption(_Strict):
    """One asset class's long-term expected return and volatility (decimals)."""

    asset_class: AssetClass
    label: str = Field(min_length=2)  # display label, e.g. "Global equity"
    expected_return: float = Field(ge=-0.5, le=0.5)  # nominal long-term
    volatility: float = Field(gt=0.0, le=1.0)


class CMA(_Strict):
    """Capital-market assumptions: per-asset-class return + vol and the correlation
    matrix between them. Shaped for ``core.moments.corr_to_cov`` (the rows of
    ``correlation`` are ordered to match ``assumptions``)."""

    schema_version: int = Field(ge=1)
    source: Citation  # e.g. "J.P. Morgan LTCMA 2026 (CHF)"
    base_currency: str
    horizon_years: int = Field(ge=1, le=50)
    assumptions: tuple[AssetClassAssumption, ...]
    correlation: tuple[tuple[float, ...], ...]

    @field_validator("base_currency")
    @classmethod
    def _currency_format(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{3}$", v):
            raise ValueError(f"base_currency must be an ISO 4217 code, got {v!r}")
        return v

    @model_validator(mode="after")
    def _matrix_valid(self) -> CMA:
        n = len(self.assumptions)
        if n == 0:
            raise ValueError("CMA must define at least one asset class")
        classes = [a.asset_class for a in self.assumptions]
        if len(classes) != len(set(classes)):
            raise ValueError("duplicate asset class in CMA assumptions")
        if len(self.correlation) != n:
            raise ValueError("correlation matrix row count must equal the asset count")
        for i, row in enumerate(self.correlation):
            if len(row) != n:
                raise ValueError("correlation matrix must be square")
            if abs(row[i] - 1.0) > 1e-9:
                raise ValueError("correlation matrix diagonal must be 1")
            for j, c in enumerate(row):
                if not -1.0 <= c <= 1.0:
                    raise ValueError("correlation entries must lie in [-1, 1]")
                if abs(c - self.correlation[j][i]) > 1e-9:
                    raise ValueError("correlation matrix must be symmetric")
        return self


# --- Bilingual content ----------------------------------------------------


class GlossaryTerm(_Strict):
    """A clickable-jargon term: the word and a concise definition, EN + FR."""

    key: str = Field(min_length=1)
    term: BilingualText
    definition: BilingualText


class Concept(_Strict):
    """A short explainer (a 'learn' card, or a Swiss 'how to invest' section).
    Body is markdown; any figure it states carries a citation."""

    key: str = Field(min_length=1)
    title: BilingualText
    body: BilingualText
    citations: tuple[Citation, ...] = ()


class InstrumentContent(_Strict):
    """Hand-written-from-real-data prose for one instrument: a plain description
    and a risk note, EN + FR, every figure cited."""

    ticker: str
    description: BilingualText
    risk_note: BilingualText
    citations: tuple[Citation, ...] = ()


class Content(_Strict):
    """The committed bilingual content snapshot."""

    schema_version: int = Field(ge=1)
    generated_at: date
    glossary: tuple[GlossaryTerm, ...] = ()
    concepts: tuple[Concept, ...] = ()
    switzerland: tuple[Concept, ...] = ()
    instruments: tuple[InstrumentContent, ...] = ()

    @model_validator(mode="after")
    def _unique_keys(self) -> Content:
        for label, keys in (
            ("glossary", [t.key for t in self.glossary]),
            ("concepts", [c.key for c in self.concepts]),
            ("switzerland", [c.key for c in self.switzerland]),
            ("instrument content", [c.ticker for c in self.instruments]),
        ):
            if len(keys) != len(set(keys)):
                raise ValueError(f"duplicate key in {label}")
        return self
