# Future You

A personal investing **research & education assistant** that builds you an optimized, personalized portfolio — and actually teaches you why. For anyone ~15 and up.

> **Status:** clean-slate rebuild (v6), in setup. The full product spec lives in [`RE-ENVISION.md`](./RE-ENVISION.md).

## What it does
- Profiles your goals & situation → a rigorous, personalized portfolio.
- Lets you choose what *you* want to hold (even "risky" names) and includes them at a responsible, **risk-adjusted weight** — with the trade-off explained.
- Deep, plain-language **research dashboards** for every stock & sector.
- A full **analytics suite** (many charts + tables; short / medium / long term).
- **Financial literacy** woven through: clean equations you can expand and understand, tap-to-define jargon, a glossary/learn page.
- **Adapts to you** — surfaces only the planning scenarios that apply (retirement, education, home, emergency fund…).

## Principles
- **Accuracy is sacred.** Real data only; AI never invents a number; every figure is verified against its source and cited.
- **Secure & accountless.** No logins, no database, no stored personal data.
- **Defensible.** Every formula is unit-tested; the finance is interview-grade but kept invisible in plain language.

## Planned layout
```
future-you/
├── README.md             ← you are here
├── RE-ENVISION.md        ← the master product brief
├── docs/                 ← VISION, METHODOLOGY, DATA, DESIGN (to come)
├── assets/illustrations/ ← the carried-over illustration library (the only reuse)
├── frontend/             ← Next.js + TS + Tailwind + shadcn   (built in Phase 0)
└── backend/              ← Python + FastAPI finance API        (built in Phase 0)
```

## Stack
Multi-page **Next.js** front-end (Vercel) + **Python FastAPI** finance engine (Render). Data via yfinance → cached snapshots, backed by a proper market-data API.

## Build approach
Built from scratch, phase by phase, in Claude Code — see `RE-ENVISION.md` §11–12. Every commit authored by ChinguunE.

---
*The previous version is archived at `../Family_Portfolio_Builder/` for reference only; nothing from it is reused except the illustrations.*
