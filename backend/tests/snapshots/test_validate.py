"""Tests for the cross-cutting snapshot validators (DATA.md §Validation)."""

from datetime import date

import pytest

from app.snapshots import validate
from app.snapshots.schemas import AssetClass, InstrumentKind, Replication, Role, ScreenStatus
from app.snapshots.validate import SnapshotValidationError
from tests.snapshots import _factories as f

# --- Screen consistency ----------------------------------------------------


def test_recompute_matches_correct_stored_status() -> None:
    # CSPX-like fund passes; NVDA-like stock fails on beta — both stored correctly.
    uni = f.universe()
    validate.assert_screen_consistent(uni)  # must not raise


def test_recompute_fund_passes() -> None:
    status = validate.recompute_screen(f.fund_instrument(), f.GENERATED_AT)
    assert status.passed and status.reasons == ()


def test_recompute_high_beta_stock_fails_on_beta() -> None:
    status = validate.recompute_screen(f.stock_instrument(), f.GENERATED_AT)
    assert not status.passed
    assert status.reasons == ("beta_too_high",)


def test_recompute_gold_etc_passes() -> None:
    etc = f.fund_instrument(
        ticker="SGLN.SW",
        name="iShares Physical Gold ETC",
        kind=InstrumentKind.ETC,
        asset_class=AssetClass.GOLD,
        role=Role.DIVERSIFIER,
        exposure="Gold",
        fund=f.fund_facts(ucits=False, ter=0.0012, replication=Replication.PHYSICAL),
    )
    status = validate.recompute_screen(etc, f.GENERATED_AT)
    assert status.passed  # ETC carve-out: not UCITS, still safe


def test_screen_drift_is_caught() -> None:
    # Claim a high-beta stock passed — a recomputation must catch the lie.
    lying = f.stock_instrument(screen=ScreenStatus(passed=True))
    assert not validate.screen_matches(lying, f.GENERATED_AT)
    with pytest.raises(SnapshotValidationError, match="screen drift"):
        validate.assert_screen_consistent(f.universe(lying))


# --- CMA covariance is PSD -------------------------------------------------


def test_valid_cma_is_psd() -> None:
    validate.assert_cma_psd(f.cma())  # must not raise
    assert validate.cma_is_psd(f.cma())


def test_non_psd_correlation_is_rejected() -> None:
    # Symmetric, unit-diagonal, in-range — passes the schema — but NOT psd.
    bad = f.cma(
        classes=(AssetClass.WORLD_EQUITY, AssetClass.US_EQUITY, AssetClass.EM_EQUITY),
        correlation=((1.0, 0.9, 0.9), (0.9, 1.0, -0.9), (0.9, -0.9, 1.0)),
        returns=(0.06, 0.07, 0.08),
        vols=(0.15, 0.16, 0.20),
    )
    assert not validate.cma_is_psd(bad)
    with pytest.raises(SnapshotValidationError, match="positive-semidefinite"):
        validate.assert_cma_psd(bad)


def test_cma_covariance_diagonal_is_variance() -> None:
    cov = validate.cma_covariance(f.cma())
    # diagonal entries equal vol**2
    assert cov[0, 0] == pytest.approx(0.15**2)
    assert cov[1, 1] == pytest.approx(0.05**2)


# --- CMA covers the universe ----------------------------------------------


def test_cma_must_cover_every_universe_asset_class() -> None:
    uni = f.universe(f.fund_instrument())  # uses US_EQUITY
    cma_without_us = f.cma()  # defines WORLD_EQUITY + GLOBAL_AGG_BONDS only
    assert validate.missing_cma_classes(uni, cma_without_us) == {"us_equity"}
    with pytest.raises(SnapshotValidationError, match="us_equity"):
        validate.assert_cma_covers_universe(uni, cma_without_us)


def test_cma_coverage_passes_when_class_present() -> None:
    uni = f.universe(f.fund_instrument(asset_class=AssetClass.WORLD_EQUITY))
    validate.assert_cma_covers_universe(uni, f.cma())  # must not raise


# --- Freshness -------------------------------------------------------------


def test_fresh_within_window() -> None:
    assert validate.freshness_ok(
        date(2026, 6, 1), today=date(2026, 6, 29), max_age_days=400
    )


def test_stale_snapshot_rejected() -> None:
    assert not validate.freshness_ok(
        date(2024, 1, 1), today=date(2026, 6, 29), max_age_days=400
    )
    with pytest.raises(SnapshotValidationError, match="stale"):
        validate.assert_fresh(date(2024, 1, 1), today=date(2026, 6, 29))


def test_future_dated_snapshot_rejected() -> None:
    assert not validate.freshness_ok(
        date(2027, 1, 1), today=date(2026, 6, 29), max_age_days=400
    )
