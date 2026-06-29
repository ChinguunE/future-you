# Future You — working guide for Claude Code

**Future You** is an accountless, bilingual (EN/FR) personal investing **research & education** assistant that also builds an optimized, personalized portfolio (ages ~15+, Swiss / UCITS-first). It teaches as it recommends; an allocation you don't understand is useless.

- **Master brief:** [`RE-ENVISION.md`](./RE-ENVISION.md)
- **Specs (the contract):** [`docs/VISION.md`](docs/VISION.md) · [`docs/DESIGN.md`](docs/DESIGN.md) · [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) · [`docs/DATA.md`](docs/DATA.md) · [`docs/IPS.md`](docs/IPS.md) · [`docs/SWITZERLAND.md`](docs/SWITZERLAND.md)
- **Approved build plan:** `/Users/chinguun/.claude/plans/you-re-my-senior-engineer-magical-glade.md`

---

## ⚠️ Non-negotiables (read every session)

### 1. Git & commits
- **Author AND committer = `ChinguunE <chinguunka@gmail.com>`** (set repo-local; already configured).
- **NEVER** add `Co-Authored-By`, "Generated with…", or 🤖 to a commit message. A `prepare-commit-msg` hook auto-strips these on every commit — **do not remove or weaken that hook.**
- Audit before any push: `git log --format='%an <%ae> | %cn <%ce>'` (both columns must be ChinguunE) and `git log --grep='Co-Authored-By\|Generated with'` (must be empty).
- Commit **per slice** — small, reviewed, with a plain message.

### 2. Secrets & data keys
- **Nothing secret in the browser bundle.** Anything prefixed `NEXT_PUBLIC_` is compiled into client JS and is **public** — the only allowed use is `NEXT_PUBLIC_API_BASE_URL`.
- Data-provider / Anthropic keys live **only** in the backend refresh-job environment, **off the request path**. The deployed app needs **no runtime data keys** (it reads committed snapshots).
- `.env*` is gitignored; commit `.env.example` with placeholder names only.

### 3. Accuracy is sacred
- **Real data only.** AI never originates a fact or a number — it may only rephrase real data into plain language. Every figure the user sees **traces to a snapshot source value** (and, once the AI pipeline lands, an automated number-verification gate enforces it).
- **Finance is unit-tested** (known input → known output) in a pure `core/` package with zero web imports.

### 4. Design — Skills Protocol (BEFORE any UI work)
Auto-invocation is unreliable, so design skills are invoked **explicitly, by name, per task**, and **announced**:
- Tokens / design system / components → **`frontend-design`** + **`ui-ux-pro-max:design`**
- Visual styling & polish → **`ui-ux-pro-max:ui-styling`**
- shadcn components → **`shadcn`**
- Every screen's build → screenshot → refine loop → **`playwright`**

**Announce + gate:** say "Invoking `<skill>`…" *before* the work; if UI got made without it, that's a process error — **redo it. Never design from memory.**
**Pre-flight (Phase 0):** confirm installed via `/plugin`: Frontend Design · UI UX Pro Max · shadcn · Playwright (+ Superpowers). If one's missing, **stop and tell Chinguun.**
**Use both, every screen:** the written system (`docs/DESIGN.md`) **and** the reference images in `inspiration/duolingo/` (open the actual files; map specific patterns → specific screens — DESIGN §13).

### 5. Bilingual EN / FR
- **No hard-coded UI strings** — everything via **next-intl** with `[locale]` routing (`/en`, `/fr`).
- French runs **~15–20% longer** — don't pin widths to English. **Nunito** carries full French accents.
- Format **CHF / numbers / dates per locale** (tabular numerals for money). All content verified in **both** languages.

### 6. Working style
- **Chinguun is a beginner** — explain each step **simply**, and **pause for approval at each permission prompt**. Don't batch many actions unattended.

---

## Architecture (quick map)
- **Monorepo:** `frontend/` (Next.js App Router + TS + Tailwind + shadcn/ui → Vercel) · `backend/` (Python FastAPI + numpy/scipy → Render).
- **Backend split:** pure `core/` finance engine (no FastAPI/IO imports, 100% unit-tested) + thin `app/` FastAPI shell. One composite **`POST /plan`** computes the whole plan; snapshot-only **GET** reads for asset/sector/glossary/universe.
- **Accountless & stateless:** no database, no logins, no stored personal data. The profile rides in the request and the **URL hash** (the share-link mechanism — never sent to a server).
- **Snapshots, not live scraping:** committed JSON served offline; the research surface is **bundled into the frontend** (`public/data`) for instant, cold-start-proof first paint. The engine is only hit on compute.

## Design tokens (from `docs/DESIGN.md`)
- **Palette** sampled from the illustrations: brand green `--green-600 #2E8B6F` (primary action; verify AA for white text), `--ink #14302B`, `--paper #FBF7EC`, accents coral/gold/sky/grape; gains `--pos` + ▲, losses `--neg` + ▼ (**never colour alone**).
- **Type:** Baloo 2 (display) + Nunito (body/numbers), self-hosted via `next/font`.
- **Signature:** the pressable button with a hard 4px bottom-shadow that sinks on press.
- **Mascot:** the green two-leaf **Sprout** (`assets/illustrations/mascot/…`), used **big**, one distinct pose per context.

## Build phases
0 setup + live URL · 1 finance core (test-first) · 2 data + hand-written content · 3 API · 4 design system · 5 pages · 6 polish · 7 present. Per UI slice: **build → run → Playwright screenshot (+axe-core) → refine → commit as ChinguunE → `/clear` → next.**
