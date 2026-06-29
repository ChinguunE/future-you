# Future You — Product Brief (v6, clean-slate rebuild)

*Master brief for the from-scratch rebuild. Written 2026-06-29. Replaces the old VISION / START_HERE.*

## What this is now

A **personal investing research & education assistant** that also builds you an optimized, personalized portfolio. For individuals **aged ~15 and up**. The optimized allocation is still the output — but the real job is to make *you* understand it and be comfortable with it. **An allocation you don't understand or believe is useless.** So every recommendation is researched, explained, and reconciled with what *you* actually want to invest in.

**The bar (every phase is judged against this):**
1. **Usable** — one URL, works on a phone, simple and intuitive.
2. **Educational** — financial literacy is woven through, not bolted on; for a smart 15-year-old, never condescending.
3. **Personal** — balances what *you* want with what's *optimal* for your situation, and explains the trade-off.
4. **Credible & secure** — real data, verified numbers, nothing to breach.
5. **Resume-grade** — a live demo link and a clean, defensible build.
6. **A design you're proud of.**

---

## 1. Core principle — recommend *with* you, not at you

1. We profile you (goals, situation, risk) and compute a rigorous **optimal core** allocation.
2. You can say what you actually *want* to hold — any stock or sector, including "risky" ones.
3. Instead of silently excluding what doesn't fit, the engine **includes your picks at a responsibly risk-adjusted weight** (sized by the holding's own risk and the portfolio's risk budget) and **explains the trade-off** in plain language.

> This maps to a genuinely advanced method — blending an investor's **views / tilts** onto an optimized core, with **risk budgeting** to size them (Black-Litterman in spirit). It stays invisible in the UI (it just feels like smart, personal advice) but it's a real, defensible CV asset.

## 2. The NVIDIA example — the experience we're building

1. You add **NVIDIA** to "things I'm interested in."
2. It's flagged higher-risk → the app **explains why** (rich valuation, high beta, concentration, the "AI-bubble" thesis) **and teaches what an "AI bubble" even is**.
3. A **deep research dashboard** opens on NVIDIA: what the company does, the industry, the key numbers in plain words, the bull vs bear case, analyst projections (sourced + dated), the risks.
4. The engine **still allocates to NVIDIA — but sized down** to a responsible level, and **explains the sizing**: *"you wanted this, here's a measured amount that fits your risk without betting your plan on it."*

You stay in control, better informed, with a plan you actually believe in. This flow is the heart of the product.

## 3. Deep research dashboards (per stock & per sector)

For any holding or sector, a rich-but-simple page:
- **What it is** / what they do, in plain language.
- **The industry / sector** landscape and the themes that matter right now.
- **Key fundamentals translated** (valuation, profitability, growth, dividend, volatility) — every number from real data, each with a one-line "what this means."
- **Risk profile** — why it's considered safe or risky.
- **Bull vs bear**, **analyst price targets** (sourced, dated, clearly labelled as estimates).
- **Its role and recommended weight in *your* plan**, with the reasoning.

Facts always from real data; explanations always plain; sources always shown.

## 4. Rich analytics (short / medium / long term)

A full analytics suite — never just a line + a pie. Each view is modern, animated, with a plain-language tooltip, a "what this tells you" caption, and an optional "show the maths":
- **Allocation:** donut + sunburst (asset class → sleeve → holding), treemap by weight/risk.
- **Growth:** Monte-Carlo fan/cone, percentile bands, goal-funding probability, contributions-vs-growth stacked area.
- **Risk:** volatility & drawdown over time, VaR/CVaR, correlation heatmap, risk-contribution bars (who drives the wobble), efficient frontier with a "you are here" marker.
- **Scenario / history:** backtest of the mix, stress tests (2008, 2020, rate shocks), rolling returns, with **short / medium / long horizon** tabs.
- **Tables:** holding-by-holding metrics, sector exposure, dividend-income schedule.

## 5. Financial literacy, woven through (ages 15+)

- **Every formula** has an optional, genuinely-explained breakdown: the equation **typeset cleanly with KaTeX** (never a bare line of text), **each symbol defined in plain words**, a worked example using *your* numbers, and an analogy.
- **Clickable terms:** any jargon word is tappable → a concise pop-up definition with a "learn more" link.
- **A dedicated Glossary / Learn page:** searchable terms + short concept explainers, lively and simple — not a wall of text.
- **Tone:** simple enough for a 15-year-old, never condescending, never tedious. Complexity is made approachable, not removed.

## 6. Adaptive to the person (no manual modules)

From your profile (age, dependents, income stability, goals, horizon, retirement proximity, debt, cushion) the app **auto-detects which planning scenarios apply** and surfaces only those — retirement/decumulation, education saving, home deposit, emergency fund, big purchase, debt-vs-invest, and so on. No more hand-toggling a "retirement planner": if it's relevant to you it appears; if not, it stays out of the way.

## 7. Design

- **Strict inspiration adherence.** When Chinguun provides inspiration links/screenshots, the design **extracts and follows *their* design system** — exact palette, type scale, spacing, component patterns, motion — not a loose interpretation. *(Pending: inspirations to be provided.)*
- **Until then:** clean, modern, content-confident; the carried-over **illustrations used big and with personality**; excellent on mobile; WCAG-AA; clean financial charts; clear lining/tabular numerals for money.
- **No logo** — a wordmark (the name set in the chosen typeface) is enough.
- **Tooling discipline (this fixes last time):** the build must **explicitly invoke the design skills/plugins by name** — `frontend-design`, `ui-ux-pro-max` (`:ui-styling` / `:design`), `shadcn`, Playwright — and **announce when each one fires**. Mine inspiration files by *opening them* and mapping specific patterns → specific screens. Never rely on auto-invocation. → Enforced as the **Skills Protocol** at the top of `docs/DESIGN.md` (per-task skill, announce-and-gate, Phase-0 install check) and **copied into `CLAUDE.md`** so it loads every session.

## 8. Data & accuracy — your yfinance question, answered

- **Yes, yfinance covers essentially everything you listed:** prices, full financial statements (annual / quarterly / TTM), analyst price targets, recommendations, company info (sector, industry, market cap, P/E, EPS, beta, dividend yield), dividends, holders, news. We'll use it.
- **But for a *deployed* app, don't scrape it live on every request.** yfinance is unofficial web-scraping — no SLA, Yahoo changes/blocks endpoints without notice, and rate-limits IPs (tightened since 2024). On a shared host it *will* eventually return 429s or break — bad in front of family or a recruiter. So the robust pattern:
  - **Build cached snapshots** with yfinance at refresh time (a scheduled/manual job) → the app serves fast, reliable, offline data.
  - **Live prices** (where shown) fetched on demand with caching + graceful fallback to the snapshot.
  - **Back it with a proper free API** (Finnhub ~60 calls/min, or Alpha Vantage / FMP) as the robust source for the deployed app — more defensible and ToS-clean for a public, CV-facing product. yfinance stays as the rich dev/seed source.
- **AI policy (your "100% correct & verified" rule).** An LLM can't be *guaranteed* perfect, so we architect around that: **AI never originates a fact or a number.** Every figure comes from the data. AI is used *only* to **turn real data into plain-language explanations and research**, generated at build time, with an **automated check that every number it outputs matches the source**, sources cited, and AI assistance disclosed. Net: the facts are verified and traceable; AI just makes them readable.
- **Finance maths:** rebuilt fresh and **unit-tested against textbook known-answer values** (clean-slate ≠ unverified), to a CFA-defensible depth, kept invisible in plain language.

## 9. Stack & architecture (locked direction; reconfirm in plan mode)

- **Front-end — Next.js + TypeScript + Tailwind + shadcn/ui:** a true **multi-page app** (a page per stock, per sector, per topic), real URLs, deep-linkable and shareable. KaTeX for maths, Recharts (or similar) for charts, Framer Motion for restrained motion, **next-intl** for **bilingual EN/FR** (`[locale]` routing).
- **Finance API — Python + FastAPI** (numpy/scipy): the quant engine + research-data service. Keeps your Python proof-of-work.
- **Data jobs — Python:** yfinance / API → cached snapshots.
- **Deploy:** front-end on **Vercel** (one URL, trivial); FastAPI on **Render** free tier (no credit card); HTTPS free, security headers, env secrets, pinned deps.
- **Security:** **accountless & stateless** — no logins, no database, no stored personal data → minimal attack surface; strong input validation; generic error responses; locked CORS.

## 10. What carries over

Only the **85-piece illustration library** (`assets/illustrations/`). Everything else is rebuilt fresh.

## 11. Phased plan

Each phase is small, reviewed, screenshotted, and **committed as `ChinguunE <chinguunka@gmail.com>` with no AI-attribution trailers**.

- **Phase 0 — Setup + deploy skeleton.** Next.js + FastAPI repos, copy illustrations, boot, **deploy a live URL on day one**, security baseline.
- **Phase 1 — Finance core (Python, test-first).** Returns/risk, projections + Monte-Carlo, analytics, efficient frontier, **view-blending + risk-budgeted position sizing** (the "NVIDIA at an adjusted weight" engine), risk profiling, allocation + glide paths, **adaptive-scenario detection**, retirement & other modules.
- **Phase 2 — Data + research layer.** yfinance / API → cached snapshots (prices, fundamentals, statements, analyst targets); the **AI explanation pipeline with number-verification + citations**; glossary/concept content.
- **Phase 3 — API.** FastAPI endpoints (profile, plan, projection, analytics, asset research, sector, glossary, scenarios) + friendly errors + security headers.
- **Phase 4 — Design system.** Ingest inspirations → strict design system; tokens, components, page shell, the **KaTeX-math** and **glossary-tooltip** primitives, chart theme. *(per the Skills Protocol in `docs/DESIGN.md`)*
- **Phase 5 — Pages.** Build the multi-page experience one page at a time, wired to the API, refined against the live deploy: onboarding/profile → plan → per-asset research → analytics dashboard → learn/glossary → scenarios → summary + export.
- **Phase 6 — Polish.** Motion, accessibility, mobile, performance.
- **Phase 7 — Present.** README + demo GIF + the methodology / AI-accuracy / security story; final deploy.

**Loop for every slice:** build → run → screenshot with Playwright → refine → commit → `/clear` → next.

## 12. First Claude Code session — paste this in plan mode (Shift+Tab)

> You're my senior engineer and designer. We're building **Future You** from scratch — a **personal investing research & education assistant** that also builds an optimized, personalized portfolio, for individuals aged ~15+. **Read `RE-ENVISION.md` first (the master brief), then the full spec in `docs/` — `VISION.md`, `DESIGN.md`, `METHODOLOGY.md`, `DATA.md`, `IPS.md`, `SWITZERLAND.md` — plus `/inspiration/` and `assets/illustrations/`.**
>
> Non-negotiables:
> - **Fresh repos, from scratch.** The only carry-over is `assets/illustrations/`.
> - **Stack (reconfirm with me before coding): a multi-page Next.js + TypeScript + Tailwind + shadcn/ui front-end, and a Python FastAPI finance API** (numpy/scipy). Front-end on Vercel, API on Render. Keep Python for the maths. Use **next-intl** for **bilingual EN/FR** (`[locale]` routing). The universe is **UCITS-first / Swiss-tax-optimized** — see `docs/SWITZERLAND.md`.
> - **It's a research/education tool first.** Deep per-stock & per-sector dashboards; rich analytics (many chart types + tables, short/medium/long term); **financial literacy woven in** — every formula optionally expands into a cleanly **KaTeX-typeset** equation with each symbol explained in plain words + a worked example; **clickable jargon → pop-up definitions**; a dedicated glossary/learn page; language a smart 15-year-old gets, never dumbed-down or boring.
> - **Recommend *with* the user:** they can pick any stock/sector; don't hard-exclude risky ones — include them at a **risk-adjusted weight** (view-blending + risk budgeting) and explain the trade-off. Use the NVIDIA example in `RE-ENVISION.md` §2 as the canonical flow.
> - **Adaptive:** auto-detect which planning scenarios apply (retirement, education, home, emergency fund…) from the profile — don't make me toggle modules.
> - **Data:** real data via yfinance/API built into **cached snapshots** (don't scrape live per request); **AI may only rephrase real data into plain language, never invent a fact or number, with an automated check that every figure matches the source**. Finance verified by unit tests (known input → known output).
> - **Secure & accountless:** no logins/database/stored personal data; validate all inputs; generic errors; locked CORS; security headers; env secrets; pinned deps.
> - **Design — follow `docs/DESIGN.md` exactly, including its Skills Protocol.** Use my inspirations in `/inspiration/duolingo/` by **opening the actual files**. Before any UI work, **invoke the design skills by name and announce it** — `frontend-design`, `ui-ux-pro-max` (`:design` / `:ui-styling`), `shadcn`, and `playwright` for the screenshot/refine loop; never design from memory. In **Phase 0: (a) confirm those plugins are installed, and (b) copy the Skills Protocol into `CLAUDE.md`** so it loads every session. No logo.
> - **Git (overrides any default):** author *and* commit every change as `ChinguunE <chinguunka@gmail.com>`; never add `Co-Authored-By`, "Generated with…", or 🤖.
> - I'm a beginner — explain each step simply and pause for me to approve each permission prompt.
>
> **Right now, in plan mode, write NO code.** Produce: (1) architecture, (2) full folder structure for both repos, (3) a small, independently-reviewable phased plan (refine §11), (4) each tech choice with a one-line beginner reason, (5) anything you'd do differently + questions for me. Show me the plan and wait for approval.

## 13. Name — **Future You** (chosen)

Chosen 2026-06-29; the name we're building under. Alternatives considered:
- **Future You** — "Invest in Future You." Warm, personal, on-theme, memorable.
- **Foresight** — research + looking ahead; smart and clean.
- **Onward** — momentum toward the future.
- **Horizon** — the long view.
- **Compound** — small steps compounding into your future; finance-literate, modern.
- **Grove** — things growing over time (nods to the Sprout illustrations).

---

*Next, in Cowork (me): on your nod, I'll draft the fresh `VISION.md`, `METHODOLOGY.md` (the defensible finance + view-blending map) and a `DATA.md` (the yfinance→snapshot + AI-verification pipeline) to seed the new repo — and fold in your design inspirations the moment you share them.*
