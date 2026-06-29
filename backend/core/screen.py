"""Safe-universe screen (METHODOLOGY §10).

Defines "safe, not gambling" by rules, so micro-caps, recent IPOs and meme/
high-vol names are excluded from the *core* universe automatically. Stocks face
quality rules; funds face a UCITS-first, Swiss-appropriate gate (SWITZERLAND
§1); bonds must be investment-grade.

Failing the screen is not a ban: it explains *why* a name is risky. A pick that
fails can still enter the plan as a capped satellite via :mod:`core.tilts` — the
NVIDIA flow. Reasons are stable codes; the UI renders the bilingual prose.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

__all__ = [
    "StockMetrics",
    "FundMetrics",
    "ScreenResult",
    "screen_stock",
    "screen_fund",
    "is_investment_grade",
]

# --- Stock quality thresholds ---------------------------------------------
_MIN_MARKET_CAP = 10_000_000_000.0  # large-cap floor (~CHF/USD 10bn)
_MAX_BETA = 1.5  # low-to-moderate market sensitivity
_MIN_YEARS_LISTED = 3.0  # enough track record (excludes fresh IPOs)

# --- Fund (ETF) thresholds, Swiss-appropriate ------------------------------
_MAX_TER = 0.005  # 0.5% total expense ratio
_MIN_AUM = 100_000_000.0  # enough assets to be liquid/durable
_MIN_FUND_YEARS = 1.0
_ALLOWED_DOMICILES = frozenset({"IE", "LU", "CH"})  # UCITS-first; US excluded by default

# Standard & Poor's-style investment-grade ratings (BBB- and above).
_INVESTMENT_GRADE = frozenset(
    {"AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"}
)


@dataclass(frozen=True)
class StockMetrics:
    """The facts the stock screen reads (sourced from a snapshot)."""

    market_cap: float
    is_profitable: bool
    pays_dividend: bool
    years_listed: float
    beta: float
    is_index_member: bool


@dataclass(frozen=True)
class FundMetrics:
    """The facts the fund screen reads (sourced from a snapshot)."""

    is_ucits: bool
    has_kid: bool
    ter: float
    aum: float
    years_since_inception: float
    physical_replication: bool  # preferred, not required -> not a hard rule
    domicile: str


class ScreenResult(NamedTuple):
    """Whether a name passes, and the stable reason codes if it does not."""

    passed: bool
    reasons: tuple[str, ...]


def screen_stock(
    metrics: StockMetrics,
    *,
    min_market_cap: float = _MIN_MARKET_CAP,
    max_beta: float = _MAX_BETA,
    min_years_listed: float = _MIN_YEARS_LISTED,
) -> ScreenResult:
    """Quality rules: large-cap, profitable-or-paying, established, calm, indexed."""
    reasons: list[str] = []
    if metrics.market_cap < min_market_cap:
        reasons.append("market_cap_too_small")
    if not (metrics.is_profitable or metrics.pays_dividend):
        reasons.append("not_profitable_or_paying")
    if metrics.years_listed < min_years_listed:
        reasons.append("insufficient_track_record")
    if metrics.beta > max_beta:
        reasons.append("beta_too_high")
    if not metrics.is_index_member:
        reasons.append("not_index_member")
    return ScreenResult(passed=not reasons, reasons=tuple(reasons))


def screen_fund(
    metrics: FundMetrics,
    *,
    max_ter: float = _MAX_TER,
    min_aum: float = _MIN_AUM,
    min_years: float = _MIN_FUND_YEARS,
    allowed_domiciles: frozenset[str] = _ALLOWED_DOMICILES,
) -> ScreenResult:
    """UCITS-first gate: KID present, low TER, liquid, established, right domicile."""
    reasons: list[str] = []
    if not metrics.is_ucits:
        reasons.append("not_ucits")
    if not metrics.has_kid:
        reasons.append("no_kid")
    if metrics.ter > max_ter:
        reasons.append("ter_too_high")
    if metrics.aum < min_aum:
        reasons.append("aum_too_small")
    if metrics.years_since_inception < min_years:
        reasons.append("too_new")
    if metrics.domicile.upper() not in allowed_domiciles:
        reasons.append("domicile_not_allowed")
    return ScreenResult(passed=not reasons, reasons=tuple(reasons))


def is_investment_grade(rating: str) -> bool:
    """True for S&P-style ratings BBB- and above (the bond quality floor)."""
    return rating.upper() in _INVESTMENT_GRADE
