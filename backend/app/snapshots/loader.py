"""Read & validate the committed JSON snapshots (DATA.md "snapshot pattern").

The deployed API calls these at request time. They are pure reads of files under
``backend/data/snapshots/`` — no network, no provider keys — validated through the
:mod:`app.snapshots.schemas` models, so a malformed or stale file fails loudly
here rather than reaching a user.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import ValidationError

from app.snapshots.schemas import CMA, Content, Universe

__all__ = [
    "SnapshotError",
    "SNAPSHOTS_DIR",
    "load_universe",
    "load_cma",
    "load_content",
]

# backend/app/snapshots/loader.py -> parents[2] == backend/
SNAPSHOTS_DIR = Path(__file__).resolve().parents[2] / "data" / "snapshots"


class SnapshotError(RuntimeError):
    """A snapshot file is missing, unreadable, or fails schema validation."""


def _read_json(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise SnapshotError(
            f"snapshot not found: {path} — run the refresh script to build it"
        ) from exc
    except OSError as exc:  # pragma: no cover - unusual filesystem failure
        raise SnapshotError(f"could not read snapshot {path}: {exc}") from exc


def load_universe(path: Path | None = None) -> Universe:
    """Load and validate the screened-universe snapshot."""
    target = path or SNAPSHOTS_DIR / "universe.json"
    try:
        return Universe.model_validate_json(_read_json(target))
    except ValidationError as exc:
        raise SnapshotError(f"universe snapshot failed validation: {target}\n{exc}") from exc


def load_cma(path: Path | None = None) -> CMA:
    """Load and validate the capital-market-assumptions snapshot."""
    target = path or SNAPSHOTS_DIR / "cma.json"
    try:
        return CMA.model_validate_json(_read_json(target))
    except ValidationError as exc:
        raise SnapshotError(f"CMA snapshot failed validation: {target}\n{exc}") from exc


def load_content(path: Path | None = None) -> Content:
    """Load and validate the bilingual-content snapshot."""
    target = path or SNAPSHOTS_DIR / "content.json"
    try:
        return Content.model_validate_json(_read_json(target))
    except ValidationError as exc:
        raise SnapshotError(f"content snapshot failed validation: {target}\n{exc}") from exc
