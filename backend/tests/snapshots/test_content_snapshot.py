"""Validate the committed bilingual content snapshot (data/snapshots/content.json).

Confirms it loads through the schema, every universe instrument has content, all
text is genuinely bilingual (EN + FR present), the Swiss how-to sections are
cited, and the capped-satellite framing is present for the high-beta demo names.
"""

import pytest

from app.snapshots import loader
from app.snapshots.schemas import BilingualText


@pytest.fixture(scope="module")
def content():
    return loader.load_content()


def _both_languages(text: BilingualText) -> bool:
    return bool(text.en.strip()) and bool(text.fr.strip())


def test_content_loads_with_expected_shape(content) -> None:
    assert len(content.glossary) >= 30
    assert len(content.concepts) >= 6
    assert len(content.switzerland) >= 4
    assert len(content.instruments) >= 20


def test_every_universe_instrument_has_content(content) -> None:
    universe = loader.load_universe()
    have = {c.ticker for c in content.instruments}
    missing = [i.ticker for i in universe.instruments if i.ticker not in have]
    assert not missing, f"instruments missing content: {missing}"


def test_all_text_is_bilingual(content) -> None:
    for term in content.glossary:
        assert _both_languages(term.term) and _both_languages(term.definition), term.key
    for concept in (*content.concepts, *content.switzerland):
        assert _both_languages(concept.title) and _both_languages(concept.body), concept.key
    for inst in content.instruments:
        assert _both_languages(inst.description) and _both_languages(inst.risk_note), inst.ticker


def test_swiss_sections_are_cited(content) -> None:
    for section in content.switzerland:
        assert section.citations, f"Swiss section {section.key} has no citation"
        assert all(c.url.startswith("https://") for c in section.citations)


def test_pillar_3a_states_the_2026_figure(content) -> None:
    sections = {s.key: s for s in content.switzerland}
    pillar = next(s for k, s in sections.items() if "3a" in k or "pillar" in k)
    assert "7,258" in pillar.body.en or "7258" in pillar.body.en


def test_high_beta_names_explain_the_capped_satellite_path(content) -> None:
    by_ticker = {c.ticker: c for c in content.instruments}
    for ticker in ("NVDA", "TSLA"):
        note = by_ticker[ticker].risk_note.en.lower()
        assert "satellite" in note or "small" in note or "safe" in note, (
            f"{ticker} risk note should explain it is sized down, not excluded"
        )


def test_cma_volatility_quotes_carry_the_jpm_citation(content) -> None:
    # The funds whose risk note quotes the asset-class long-term volatility (from
    # the CMA) must carry the JPM citation so that figure traces to its source.
    by_ticker = {c.ticker: c for c in content.instruments}
    for ticker in ("MEUD.PA", "CHSPI.SW", "AGGS.SW", "SGLN.L"):
        sources = " ".join(c.source for c in by_ticker[ticker].citations)
        assert "J.P. Morgan" in sources, f"{ticker} quotes a CMA volatility without its citation"
