"""Cross-cutting snapshot checks that need the finance engine (DATA.md §Validation).

The pydantic schemas guarantee each file's *shape*; these functions guarantee its
*meaning* against :mod:`core`:

* **Screen consistency** — recompute every instrument's safe-universe screen from
  its facts and confirm the stored result matches (no hand-edited drift).
* **PSD covariance** — build the CMA covariance via :func:`core.moments.corr_to_cov`
  and confirm it is positive-semidefinite, so the optimiser cannot manufacture
  risk-free return that does not exist (METHODOLOGY §1).
* **Coverage** — every asset class the universe uses has a CMA assumption row.
* **Freshness** — the snapshot's as-of date is within an allowed age.

Each ``assert_*`` raises :class:`SnapshotValidationError` with a plain message; the
``*_ok`` / compute helpers are side-effect-free so tests and the validate script
can reuse them.
"""

from __future__ import annotations

from datetime import date

import numpy as np
from numpy.typing import NDArray

from app.snapshots.schemas import (
    CMA,
    Instrument,
    InstrumentKind,
    Replication,
    ScreenStatus,
    Universe,
)
from core.moments import corr_to_cov, is_positive_semidefinite
from core.screen import (
    EtcMetrics,
    FundMetrics,
    StockMetrics,
    screen_etc,
    screen_fund,
    screen_stock,
)

__all__ = [
    "SnapshotValidationError",
    "DEFAULT_MAX_AGE_DAYS",
    "years_between",
    "recompute_screen",
    "screen_matches",
    "assert_screen_consistent",
    "cma_covariance",
    "cma_is_psd",
    "assert_cma_psd",
    "missing_cma_classes",
    "assert_cma_covers_universe",
    "freshness_ok",
    "assert_fresh",
]

_DAYS_PER_YEAR = 365.25
DEFAULT_MAX_AGE_DAYS = 400  # an annual refresh plus a generous grace window


class SnapshotValidationError(RuntimeError):
    """A snapshot is well-formed but semantically wrong (screen drift, non-PSD…)."""


def years_between(start: date, end: date) -> float:
    """Calendar years from ``start`` to ``end`` (negative if ``end`` precedes it)."""
    return (end - start).days / _DAYS_PER_YEAR


# --- Safe-universe screen consistency -------------------------------------


def recompute_screen(instrument: Instrument, as_of: date) -> ScreenStatus:
    """Recompute the screen for one instrument from its facts (the source of truth)."""
    if instrument.kind is InstrumentKind.STOCK:
        s = instrument.stock
        assert s is not None  # schema guarantees this for a stock
        result = screen_stock(
            StockMetrics(
                market_cap=s.market_cap,
                is_profitable=s.is_profitable,
                pays_dividend=s.pays_dividend,
                years_listed=years_between(s.first_trade_date, as_of),
                beta=s.beta,
                is_index_member=s.is_index_member,
            )
        )
    elif instrument.kind is InstrumentKind.ETC:
        f = instrument.fund
        assert f is not None
        result = screen_etc(
            EtcMetrics(
                is_physically_backed=f.replication is Replication.PHYSICAL,
                has_kid=f.has_kid,
                ter=f.ter,
                aum=f.aum,
                years_since_inception=years_between(f.inception_date, as_of),
                domicile=f.domicile,
            )
        )
    else:  # UCITS_FUND
        f = instrument.fund
        assert f is not None
        result = screen_fund(
            FundMetrics(
                is_ucits=f.ucits,
                has_kid=f.has_kid,
                ter=f.ter,
                aum=f.aum,
                years_since_inception=years_between(f.inception_date, as_of),
                physical_replication=f.replication
                in (Replication.PHYSICAL, Replication.PHYSICAL_SAMPLING),
                domicile=f.domicile,
            )
        )
    return ScreenStatus(passed=result.passed, reasons=tuple(result.reasons))


def screen_matches(instrument: Instrument, as_of: date) -> bool:
    """True if the stored screen status equals a fresh recomputation."""
    recomputed = recompute_screen(instrument, as_of)
    return instrument.screen.passed == recomputed.passed and set(
        instrument.screen.reasons
    ) == set(recomputed.reasons)


def assert_screen_consistent(universe: Universe) -> None:
    """Raise if any stored screen status disagrees with a recomputation."""
    for inst in universe.instruments:
        if not screen_matches(inst, universe.generated_at):
            recomputed = recompute_screen(inst, universe.generated_at)
            raise SnapshotValidationError(
                f"screen drift for {inst.ticker}: stored "
                f"{(inst.screen.passed, tuple(inst.screen.reasons))} != recomputed "
                f"{(recomputed.passed, tuple(recomputed.reasons))}"
            )


# --- CMA covariance is positive-semidefinite ------------------------------


def cma_covariance(cma: CMA) -> NDArray[np.float64]:
    """Build the covariance matrix from the CMA's vols and correlation matrix."""
    vols = np.array([a.volatility for a in cma.assumptions], dtype=np.float64)
    corr = np.array([list(row) for row in cma.correlation], dtype=np.float64)
    return corr_to_cov(corr, vols)


def cma_is_psd(cma: CMA, *, tol: float = 1e-10) -> bool:
    """True if the CMA covariance is positive-semidefinite (a valid risk model)."""
    return is_positive_semidefinite(cma_covariance(cma), tol=tol)


def assert_cma_psd(cma: CMA, *, tol: float = 1e-10) -> None:
    """Raise if the CMA covariance is not positive-semidefinite."""
    if not cma_is_psd(cma, tol=tol):
        raise SnapshotValidationError(
            "CMA covariance is not positive-semidefinite — the correlation matrix "
            "is internally inconsistent and would let the optimiser invent return"
        )


# --- CMA covers every asset class the universe uses -----------------------


def missing_cma_classes(universe: Universe, cma: CMA) -> set[str]:
    """Asset classes used in the universe that the CMA does not define."""
    used = {inst.asset_class for inst in universe.instruments}
    defined = {a.asset_class for a in cma.assumptions}
    return {ac.value for ac in (used - defined)}


def assert_cma_covers_universe(universe: Universe, cma: CMA) -> None:
    """Raise if any universe asset class lacks a CMA assumption row."""
    missing = missing_cma_classes(universe, cma)
    if missing:
        raise SnapshotValidationError(
            f"CMA is missing assumptions for asset classes used in the universe: "
            f"{sorted(missing)}"
        )


# --- Freshness ------------------------------------------------------------


def freshness_ok(as_of: date, *, today: date, max_age_days: int = DEFAULT_MAX_AGE_DAYS) -> bool:
    """True if ``as_of`` is no older than ``max_age_days`` and not in the future."""
    age = (today - as_of).days
    return 0 <= age <= max_age_days


def assert_fresh(
    as_of: date, *, today: date, max_age_days: int = DEFAULT_MAX_AGE_DAYS, label: str = "snapshot"
) -> None:
    """Raise if ``as_of`` is stale or dated in the future."""
    if not freshness_ok(as_of, today=today, max_age_days=max_age_days):
        raise SnapshotValidationError(
            f"{label} as-of {as_of.isoformat()} is stale or in the future "
            f"(today {today.isoformat()}, max age {max_age_days} days)"
        )
