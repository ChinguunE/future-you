# Future You — snapshot schemas, loaders, and validators (Phase 2 data layer).
#
# The deployed API reads *committed JSON snapshots* from `backend/data/snapshots/`
# at request time — it never calls a data provider live (DATA.md "snapshot
# pattern"). This package is the typed contract for those files: pydantic schemas
# (`schemas`), the read-and-validate loaders (`loader`), and the cross-cutting
# checks — PSD covariance, freshness, citations, and the safe-universe screen —
# in `validate`. It imports only pydantic and the pure `core` engine; no web/IO
# beyond reading the committed files, so it is safe on the request path.
