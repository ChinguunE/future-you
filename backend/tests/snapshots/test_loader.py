"""Tests for the snapshot loaders — round-trip, missing-file, malformed-file."""

from pathlib import Path

import pytest

from app.snapshots import loader
from app.snapshots.loader import SnapshotError
from tests.snapshots import _factories as f


def test_universe_round_trips_through_disk(tmp_path: Path) -> None:
    uni = f.universe()
    path = tmp_path / "universe.json"
    path.write_text(uni.model_dump_json(), encoding="utf-8")
    loaded = loader.load_universe(path)
    assert loaded == uni


def test_cma_round_trips_through_disk(tmp_path: Path) -> None:
    cma = f.cma()
    path = tmp_path / "cma.json"
    path.write_text(cma.model_dump_json(), encoding="utf-8")
    assert loader.load_cma(path) == cma


def test_missing_file_raises_clear_error(tmp_path: Path) -> None:
    with pytest.raises(SnapshotError, match="not found"):
        loader.load_universe(tmp_path / "does-not-exist.json")


def test_malformed_json_raises_validation_error(tmp_path: Path) -> None:
    path = tmp_path / "universe.json"
    path.write_text('{"schema_version": 1, "instruments": "not a list"}', encoding="utf-8")
    with pytest.raises(SnapshotError, match="failed validation"):
        loader.load_universe(path)


def test_default_paths_point_into_data_snapshots() -> None:
    # The deployed app reads from backend/data/snapshots/ (no args).
    assert loader.SNAPSHOTS_DIR.name == "snapshots"
    assert loader.SNAPSHOTS_DIR.parent.name == "data"
