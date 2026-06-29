"""Validate the committed CMA snapshot (data/snapshots/cma.json).

This guards the real artifact the optimiser will consume: it loads through the
schema, its covariance is positive-semidefinite, it is CHF-based, carries a JPM
citation, and defines every asset class the curated universe seed uses.
"""

from pathlib import Path

import pytest
import yaml

from app.snapshots import loader, validate
from app.snapshots.schemas import AssetClass

_BACKEND = Path(__file__).resolve().parents[2]
_SEED = _BACKEND / "data" / "seed" / "universe.yaml"


@pytest.fixture(scope="module")
def cma():
    return loader.load_cma()


def test_cma_snapshot_loads_and_is_chf(cma) -> None:
    assert cma.base_currency == "CHF"
    assert len(cma.assumptions) == 10
    assert 10 <= cma.horizon_years <= 15


def test_cma_snapshot_is_psd(cma) -> None:
    validate.assert_cma_psd(cma)  # must not raise


def test_cma_snapshot_is_cited_to_jpm(cma) -> None:
    assert "J.P. Morgan" in cma.source.source
    assert cma.source.url.startswith("https://")
    assert cma.source.as_of.year >= 2025


def test_arithmetic_return_at_least_compound_for_equities(cma) -> None:
    # For risky assets the arithmetic mean must exceed the compound rate
    # (it is the cash/near-zero-vol lines where JPM's two figures can invert).
    equities = {
        AssetClass.WORLD_EQUITY,
        AssetClass.US_EQUITY,
        AssetClass.EUROPE_EQUITY,
        AssetClass.SWISS_EQUITY,
        AssetClass.JAPAN_EQUITY,
        AssetClass.EM_EQUITY,
    }
    for a in cma.assumptions:
        if a.asset_class in equities:
            assert a.expected_return >= a.compound_return


def test_cma_covers_universe_seed_asset_classes(cma) -> None:
    seed = yaml.safe_load(_SEED.read_text(encoding="utf-8"))
    used = {row["asset_class"] for row in seed["funds"]} | {
        row["asset_class"] for row in seed["stocks"]
    }
    defined = {a.asset_class.value for a in cma.assumptions}
    missing = used - defined
    assert not missing, f"CMA missing asset classes used by the universe seed: {missing}"
