"""Snapshot-read endpoints (GET) — the research surface.

Thin reads over the committed snapshots: the instrument universe, one asset's
facts joined with its prose, the Learn content (glossary + explainers), and the
capital-market assumptions. No compute, no data-provider call — just the cached
snapshots, served as-is. (A per-sector read is deferred: the snapshots carry an
asset-class/exposure label per instrument, not a structured sector dataset.)
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api import data
from app.api.errors import ApiError
from app.api.schemas import AssetDetail, LearnContent
from app.snapshots.schemas import CMA, Universe

router = APIRouter()


@router.get("/universe", response_model=Universe)
def get_universe(passing: bool = False) -> Universe:
    """The instrument universe. ``?passing=true`` keeps only safe-screen passers."""
    full = data.universe()
    if not passing:
        return full
    kept = tuple(inst for inst in full.instruments if inst.screen.passed)
    return Universe(
        schema_version=full.schema_version,
        generated_at=full.generated_at,
        instruments=kept,
    )


@router.get("/assets/{ticker}", response_model=AssetDetail)
def get_asset(ticker: str) -> AssetDetail:
    """One instrument's facts joined with its plain-language prose (by ticker)."""
    key = ticker.upper()
    instrument = data.universe_index().get(key)
    if instrument is None:
        raise ApiError(code="asset_not_found", status_code=404)
    return AssetDetail(instrument=instrument, content=data.content_index().get(key))


@router.get("/glossary", response_model=LearnContent)
def get_glossary() -> LearnContent:
    """The Learn surface: glossary terms plus concept and Switzerland explainers."""
    content = data.content()
    return LearnContent(
        schema_version=content.schema_version,
        generated_at=content.generated_at.isoformat(),
        glossary=content.glossary,
        concepts=content.concepts,
        switzerland=content.switzerland,
    )


@router.get("/cma", response_model=CMA)
def get_cma() -> CMA:
    """The capital-market assumptions with their source citation (transparency)."""
    return data.cma()
