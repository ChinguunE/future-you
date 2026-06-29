"""Validate the committed snapshots — the pre-ship / CI gate (DATA.md §Validation).

Loads the committed snapshots and runs every cross-cutting check: schema (via the
loaders), the safe-universe screen recomputation (no drift), PSD covariance, that
the CMA covers every asset class the universe uses, and freshness. ``run()``
returns a list of problems (empty means all good) so tests can reuse it; ``main``
prints a report and exits non-zero on any problem.

Run from ``backend/``::

    python -m scripts.validate_snapshots
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, date, datetime

from app.snapshots import loader, validate
from app.snapshots.loader import SnapshotError
from app.snapshots.validate import SnapshotValidationError


def run(today: date | None = None) -> list[str]:
    """Run all snapshot checks; return a list of human-readable problems (empty = OK)."""
    today = today or datetime.now(UTC).date()

    try:
        universe = loader.load_universe()
    except SnapshotError as exc:
        return [f"universe failed to load: {exc}"]
    try:
        cma = loader.load_cma()
    except SnapshotError as exc:
        return [f"cma failed to load: {exc}"]

    checks: list[tuple[str, Callable[[], None]]] = [
        ("screen consistency", lambda: validate.assert_screen_consistent(universe)),
        ("CMA covariance PSD", lambda: validate.assert_cma_psd(cma)),
        ("CMA covers universe", lambda: validate.assert_cma_covers_universe(universe, cma)),
        ("universe freshness", lambda: validate.assert_fresh(
            universe.generated_at, today=today, label="universe")),
        ("CMA freshness", lambda: validate.assert_fresh(
            cma.source.as_of, today=today, label="cma")),
    ]
    problems: list[str] = []
    for label, check in checks:
        try:
            check()
        except SnapshotValidationError as exc:
            problems.append(f"{label}: {exc}")
    return problems


def main() -> None:
    problems = run()
    if problems:
        print("SNAPSHOT VALIDATION FAILED:")
        for problem in problems:
            print(f"  - {problem}")
        raise SystemExit(1)
    universe = loader.load_universe()
    cma = loader.load_cma()
    passed = sum(1 for i in universe.instruments if i.screen.passed)
    print(
        f"OK — universe: {len(universe.instruments)} instruments ({passed} pass the safe "
        f"screen); CMA: {len(cma.assumptions)} asset classes (PSD, covers the universe); "
        "all snapshots fresh."
    )


if __name__ == "__main__":
    main()
