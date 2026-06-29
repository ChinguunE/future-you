# `backend/data/` — the committed data layer (Phase 2)

The deployed app **never calls a data provider at request time**. It reads the
committed JSON snapshots here. Keys (when a keyed provider lands) are used only by
the refresh scripts, off the request path. See [`docs/DATA.md`](../../docs/DATA.md).

## Layout

```
data/
  seed/         # human-authored, version-controlled inputs (the curated universe + CMAs)
    universe.yaml   # the UCITS-first instrument seed: identity + cited reference fields
    cma.yaml        # capital-market assumptions: returns, vols, correlations (cited)
  snapshots/    # GENERATED, committed JSON — what the API and frontend actually read
    universe.json   # the screened universe (seed reference fields + yfinance market data + screen result)
    cma.json        # validated CMAs (PSD covariance)
    content.json    # bilingual (EN/FR) glossary / concepts / Switzerland / per-instrument prose
```

## Accuracy rule (non-negotiable — CLAUDE.md, DATA.md)

Every figure traces to a real source and is **cited with an as-of date**. Numbers
are **never invented** and **never typed from memory**:

- **Reference fields** (ISIN, TER, domicile, distribution policy, inception) are
  curated in `seed/` and verified against the issuer / justETF factsheet, each
  carrying its `citation`.
- **Market fields** (price, beta, market cap) are pulled by the refresh script
  from the snapshot provider (yfinance for the dev/seed build) and stamped with
  their `as_of` date.

The schemas in [`app/snapshots/schemas.py`](../app/snapshots/schemas.py) enforce
the shape; `scripts/validate_snapshots.py` enforces the cross-cutting rules
(safe-universe screen, PSD covariance, freshness, citations present).
