"""Integration tests for the snapshot-read GETs.

These confirm the research surface serves the committed snapshots faithfully: the
universe (with the passing-only filter), one asset's facts joined to its prose, the
Learn content, and the capital-market assumptions — plus a clean 404 for an unknown
ticker and the baseline security headers on a GET.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_universe_returns_all_instruments() -> None:
    resp = client.get("/universe")
    assert resp.status_code == 200
    body = resp.json()
    assert body["schema_version"] >= 1
    assert len(body["instruments"]) > 0
    assert {"ticker", "name", "asset_class", "role", "screen"} <= set(body["instruments"][0])


def test_universe_passing_filter_keeps_only_screen_passers() -> None:
    full = client.get("/universe").json()["instruments"]
    passing = client.get("/universe", params={"passing": "true"}).json()["instruments"]
    assert all(inst["screen"]["passed"] for inst in passing)
    assert len(passing) <= len(full)
    # The committed universe deliberately carries some flagged names.
    assert len(passing) < len(full)


def test_asset_detail_joins_facts_and_prose() -> None:
    resp = client.get("/assets/CSPX.L")
    assert resp.status_code == 200
    body = resp.json()
    assert body["instrument"]["ticker"] == "CSPX.L"
    # Prose is bilingual EN/FR when present.
    if body["content"] is not None:
        assert {"en", "fr"} <= set(body["content"]["description"])


def test_asset_lookup_is_case_insensitive() -> None:
    assert client.get("/assets/cspx.l").status_code == 200


def test_unknown_asset_is_404() -> None:
    resp = client.get("/assets/NOPE")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "asset_not_found"


def test_glossary_returns_bilingual_learn_content() -> None:
    body = client.get("/glossary").json()
    assert len(body["glossary"]) > 0
    term = body["glossary"][0]
    assert {"en", "fr"} <= set(term["term"])
    assert "concepts" in body and "switzerland" in body


def test_cma_exposes_assumptions_and_citation() -> None:
    body = client.get("/cma").json()
    assert body["base_currency"] == "CHF"
    assert len(body["assumptions"]) > 0
    assert body["source"]["url"].startswith("http")


def test_security_headers_present_on_a_get() -> None:
    resp = client.get("/cma")
    assert resp.headers["x-content-type-options"] == "nosniff"
