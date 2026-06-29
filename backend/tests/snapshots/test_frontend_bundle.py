"""The frontend bundle must match the backend snapshots exactly (no drift).

If a snapshot is refreshed in the backend but not re-bundled, the frontend would
silently serve stale data. This test fails in that case, forcing a re-bundle.
"""

from pathlib import Path

import pytest

_BACKEND = Path(__file__).resolve().parents[2]
_REPO = _BACKEND.parent
_SRC = _BACKEND / "data" / "snapshots"
_DST = _REPO / "frontend" / "public" / "data"


@pytest.mark.parametrize("name", ["universe.json", "cma.json", "content.json"])
def test_bundled_snapshot_matches_backend(name: str) -> None:
    backend_file = _SRC / name
    frontend_file = _DST / name
    assert frontend_file.exists(), (
        f"{name} not bundled into frontend/public/data — run scripts.bundle_frontend"
    )
    assert backend_file.read_bytes() == frontend_file.read_bytes(), (
        f"{name} differs between backend snapshot and frontend bundle — re-run "
        "scripts.bundle_frontend after refreshing"
    )
