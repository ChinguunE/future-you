# Future You — Data & accuracy

*The data pipeline and the AI-explanation pipeline. This is a **spec**: exact module / script / schema names are finalized in Claude Code Phases 1–2 (**⟶ TBD-in-CC**). Pairs with [`METHODOLOGY.md`](METHODOLOGY.md) (what consumes the data) and [`VISION.md`](VISION.md) / [`DESIGN.md`](DESIGN.md) (how it's shown). Written 2026-06-29.*

## Principles
1. **Real data only** — every figure the user sees traces to a real source.
2. **AI never originates a fact or a number** — it only turns real data into plain language; every number it emits is checked against the source (see AI pipeline).
3. **Everything cited & dated** — sources and as-of dates shown; AI assistance disclosed.
4. **No secrets in code, no PII stored** — keys via env, used off the request path; the app is accountless (RE-ENVISION §4).

## Sources
- **yfinance — primary breadth (at refresh time only).** Covers nearly everything we need: prices/history, **financial statements** (income / balance / cash-flow; annual + quarterly + TTM), `info` (sector, industry, market cap, P/E, EPS, beta, dividend yield, book value), **analyst price targets**, recommendations, dividends/splits, holders, news. **Unofficial web-scraping** — no SLA, rate-limited/blocked by Yahoo → we **never call it live per request** (see snapshots). It's also **US-centric**: SIX/European listings and UCITS metadata are patchier, so for our Swiss, UCITS-first universe we rely on curated lists + fund-reference sources (below) and use yfinance / the keyed API mainly for **prices** via the right exchange suffix (e.g. `.SW` for SIX).
- **A keyed market-data API as the robust source for the deployed app** — Finnhub (free ~60/min), or Alpha Vantage / FMP. More reliable and ToS-clean for a public, always-on product. Used for refresh and, optionally, live prices.
- **Live prices (optional):** fetched on demand with caching + **graceful fallback to the snapshot** if the source is slow or blocked.
- **Fund / ETF reference data:** TER, domicile, ISIN, replication, distribution policy from **justETF** and **Swiss Fund Data (SIX)**-grade sources — used to build a Swiss-appropriate, **UCITS-first** universe (see [`SWITZERLAND.md`](SWITZERLAND.md)). Not scraped guesses.
- **Capital-market assumptions (CMAs):** published long-term assumptions (e.g. J.P. Morgan / Vanguard LTCMA), with as-of dates and citations — the inputs for projections & optimisation (METHODOLOGY §2, §4).

## The snapshot pattern (the backbone)
A scheduled/manual **refresh job** pulls from the sources → validates → writes **committed JSON snapshots**. The app serves these **offline**, so it's fast, reliable, and never depends on live scraping at request time. (This is the pattern the previous build got right.)
- Snapshots (planned): `universe` (the safe, screened list + per-asset fields), `fundamentals`, `prices`, `cma`, and `content` (glossary / concepts / Switzerland). ⟶ TBD-in-CC for exact files/schemas.
- **Refresh script** ⟶ `scripts/refresh_*` · **validation script** ⟶ `scripts/validate_*`.
- The deployed app needs **no runtime data keys** — it reads snapshots. Keys are only for refresh.

## The universe
A **deliberately curated, screened universe** — chosen for trust and clarity, not size. The backbone is a vetted set of **low-cost UCITS ETFs** (broad global/regional equity, bonds, a few diversifiers), **UCITS-first and Swiss-appropriate** (see [`SWITZERLAND.md`](SWITZERLAND.md)), plus a screened set of large-cap blue chips for the optional satellite. The **safe-universe screen** (METHODOLOGY §10) gates everything. Each row carries: ticker (with exchange suffix), name, ISIN, asset class, role (core/satellite), sector, **domicile, TER, distribution policy**, key fundamentals (raw → plain words in the UI), a risk note, and an ETF flag. **All figures are pulled from sources and snapshotted — never hand-typed, never AI-invented** — and the curated list keeps the universe accurate and easy to trust rather than a sprawling, noisy catalogue.

## The AI-explanation pipeline (the careful part)
How we deliver "everything worth knowing about a stock/sector, in simple language" **without trusting the model on facts**:
1. **Ground in real data.** The model is given the holding's real numbers + sourced facts as context (RAG-style). It does **not** fetch or recall facts on its own.
2. **Generate plain-language research/education** — the business, the industry, why it's safe/risky, theme explainers (e.g. what an "AI bubble" is), bull vs bear — at a smart-15-year-old reading level (VISION teaching layer).
3. **Verification gate.** Every number/fact the output asserts is **programmatically checked against the source data**; any mismatch ⟶ reject & regenerate (or drop the claim). The model may *phrase*, never *invent*.
4. **Cache + cite + disclose.** Generated at build/refresh time (not live per request), cached, sources cited with dates, labelled **AI-assisted**.
5. **Human-reviewable.** Output is plain markdown in the snapshot, so it can be spot-checked.

## Validation & tests
Schema validation on every snapshot; covariance matrices PSD (METHODOLOGY §1); freshness / as-of checks; citations present; and the **AI number-verification gate has its own test** (a planted wrong number must be caught). ⟶ tests finalized in CC.

## Security & compliance
- **Keys via environment only**, used at refresh time, off the request path.
- **yfinance ToS:** unofficial/scraped → snapshot at refresh, never scrape live in production; prefer the keyed API for the deployed path.
- **No PII / accountless** — nothing personal is stored or sent to data providers.

## To finalize in Claude Code (Phases 1–2)
Exact snapshot filenames + schemas, the refresh/validate script names, the chosen keyed API + its client, and the AI-pipeline module + its verification tests. This doc is the contract they satisfy.
