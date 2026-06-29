"""Guard the committed snapshots: they must pass every cross-cutting check.

Reuses the same ``validate_snapshots.run`` the refresh/CI gate uses, so the
data shipped in the repo is held to the exact standard as a fresh refresh.
"""

from datetime import date

from app.snapshots import loader
from app.snapshots.schemas import InstrumentKind
from scripts.validate_snapshots import run

# Fixed reference date so the freshness check is deterministic in CI (the live
# refresh uses the real date; this just confirms the committed files are valid).
_TODAY = date(2026, 6, 29)


def test_committed_snapshots_pass_all_checks() -> None:
    problems = run(today=_TODAY)
    assert not problems, f"committed snapshots failed validation: {problems}"


def test_universe_has_the_expected_shape() -> None:
    universe = loader.load_universe()
    assert len(universe.instruments) >= 20
    kinds = {i.kind for i in universe.instruments}
    assert InstrumentKind.UCITS_FUND in kinds
    assert InstrumentKind.ETC in kinds  # the gold diversifier
    assert InstrumentKind.STOCK in kinds


def test_nvidia_and_tesla_are_flagged_high_beta() -> None:
    # The canonical capped-satellite demo: high-beta names fail the safe screen
    # (so the engine sizes them down) rather than being silently excluded.
    universe = loader.load_universe()
    by_ticker = {i.ticker: i for i in universe.instruments}
    for ticker in ("NVDA", "TSLA"):
        assert ticker in by_ticker, f"{ticker} should be in the universe"
        assert not by_ticker[ticker].screen.passed
        assert "beta_too_high" in by_ticker[ticker].screen.reasons


def test_core_funds_pass_the_screen() -> None:
    universe = loader.load_universe()
    by_ticker = {i.ticker: i for i in universe.instruments}
    for ticker in ("CSPX.L", "VWCE.DE", "AGGS.SW", "SGLN.L"):
        assert by_ticker[ticker].screen.passed, f"{ticker} should pass the screen"
