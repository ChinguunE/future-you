"""Assemble the bilingual content snapshot from the content-authoring workflow output.

DEV/build only (off the request path). Reads the content workflow's JSON result
(saved locally) and the committed universe snapshot (for each instrument's source
citation), maps everything onto the strict :class:`Content` schema, validates, and
writes ``data/snapshots/content.json``. Instruments flagged by the workflow's
number-checker are reported and, unless ``--allow-flagged`` is passed, abort the
build — no unverified number ships.

Run from ``backend/``::

    python -m scripts.build_content <workflow_output.json> [--allow-flagged]
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

from app.snapshots import loader
from app.snapshots.schemas import (
    BilingualText,
    Citation,
    Concept,
    Content,
    GlossaryTerm,
    InstrumentContent,
)

_BACKEND = Path(__file__).resolve().parents[1]
OUT_PATH = _BACKEND / "data" / "snapshots" / "content.json"
AS_OF = date(2026, 6, 29)


def _bt(en: str, fr: str) -> BilingualText:
    return BilingualText(en=en.strip(), fr=fr.strip())


def build_content(raw: dict, *, allow_flagged: bool = False) -> Content:
    universe = loader.load_universe()
    cma = loader.load_cma()
    src_by_ticker = {
        i.ticker: (i.fund or i.stock).citation.url  # type: ignore[union-attr]
        for i in universe.instruments
    }
    # A risk note may quote the asset-class long-term volatility from the CMA; when
    # it does, attach the JPM CMA citation so that figure also traces to a source.
    cma_citation = Citation(source=cma.source.source, url=cma.source.url, as_of=cma.source.as_of)

    flagged = [
        r for r in raw["instruments"]
        if isinstance(r.get("verdict"), dict) and r["verdict"].get("ok") is False
    ]
    if flagged:
        print("NUMBER-CHECKER FLAGGED:")
        for r in flagged:
            print(f"  {r['ticker']}: {r['verdict'].get('issues')}")
        if not allow_flagged:
            raise SystemExit(
                "aborting: the number-checker flagged content above. Inspect/fix, then "
                "re-run (or pass --allow-flagged once you have reviewed each)."
            )

    def _instrument(r: dict) -> InstrumentContent:
        cites = [
            Citation(
                source=(
                    f"Future You snapshot — {r['ticker']} "
                    "(justETF / Yahoo Finance via yfinance)"
                ),
                url=src_by_ticker.get(r["ticker"], "https://finance.yahoo.com/"),
                as_of=AS_OF,
            )
        ]
        if "volat" in " ".join(r.get("numbers_used", [])).lower():
            cites.append(cma_citation)  # the risk note quotes a CMA volatility
        return InstrumentContent(
            ticker=r["ticker"],
            description=_bt(r["description_en"], r["description_fr"]),
            risk_note=_bt(r["risk_note_en"], r["risk_note_fr"]),
            citations=tuple(cites),
        )

    instruments = tuple(_instrument(r) for r in raw["instruments"])
    glossary = tuple(
        GlossaryTerm(
            key=g["key"], term=_bt(g["term_en"], g["term_fr"]),
            definition=_bt(g["def_en"], g["def_fr"]),
        )
        for g in raw["glossary"]
    )
    concepts = tuple(
        Concept(
            key=c["key"], title=_bt(c["title_en"], c["title_fr"]),
            body=_bt(c["body_en"], c["body_fr"]),
        )
        for c in raw["concepts"]
    )
    switzerland = tuple(
        Concept(
            key=s["key"], title=_bt(s["title_en"], s["title_fr"]),
            body=_bt(s["body_en"], s["body_fr"]),
            citations=(Citation(source=s["source"], url=s["url"], as_of=AS_OF),),
        )
        for s in raw["switzerland"]
    )

    content = Content(
        schema_version=1, generated_at=AS_OF,
        glossary=glossary, concepts=concepts, switzerland=switzerland, instruments=instruments,
    )

    have = {c.ticker for c in content.instruments}
    missing = [i.ticker for i in universe.instruments if i.ticker not in have]
    if missing:
        raise SystemExit(f"missing content for universe instruments: {missing}")
    return content


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    allow_flagged = "--allow-flagged" in sys.argv
    if not args:
        raise SystemExit(
            "usage: python -m scripts.build_content <workflow_output.json> [--allow-flagged]"
        )
    raw = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    content = build_content(raw, allow_flagged=allow_flagged)
    OUT_PATH.write_text(content.model_dump_json(indent=2) + "\n", encoding="utf-8")
    print(
        f"wrote {OUT_PATH.name}: {len(content.instruments)} instruments, "
        f"{len(content.glossary)} glossary terms, {len(content.concepts)} concepts, "
        f"{len(content.switzerland)} Swiss sections"
    )


if __name__ == "__main__":
    main()
