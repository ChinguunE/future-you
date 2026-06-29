"""Bundle the committed snapshots into the frontend (Phase 2, DATA.md).

Copies ``backend/data/snapshots/*.json`` into ``frontend/public/data/`` so the
research surface is served statically by Next.js — instant, cold-start-proof
first paint with **no API call and no data keys** for the read-only data. The
snapshots are validated through the loaders before they are published.

Run from ``backend/``::

    python -m scripts.bundle_frontend
"""

from __future__ import annotations

import shutil
from pathlib import Path

from app.snapshots import loader

_BACKEND = Path(__file__).resolve().parents[1]
_REPO = _BACKEND.parent
SRC_DIR = _BACKEND / "data" / "snapshots"
DST_DIR = _REPO / "frontend" / "public" / "data"
# Display snapshots to publish; content.json is included once it exists (slice 6).
BUNDLED_FILES = ("universe.json", "cma.json", "content.json")


def main() -> None:
    # Validate the required snapshots before publishing anything.
    loader.load_universe()
    loader.load_cma()

    DST_DIR.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    skipped: list[str] = []
    for name in BUNDLED_FILES:
        src = SRC_DIR / name
        if src.exists():
            shutil.copyfile(src, DST_DIR / name)
            copied.append(name)
        else:
            skipped.append(name)
    print(f"bundled {copied} -> {DST_DIR.relative_to(_REPO)}")
    if skipped:
        print(f"  (not yet present, skipped: {skipped})")


if __name__ == "__main__":
    main()
