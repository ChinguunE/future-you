"""HTTP API layer for Future You — the thin FastAPI shell over the engine.

Request/response Pydantic models (`schemas`), the composite `POST /plan` route,
the snapshot-read `GET`s, and the bilingual-ready error mapping live here. This
package is the *only* place that imports FastAPI/Pydantic on the request path;
the finance maths stays in the pure, web-free `core/` package.
"""
