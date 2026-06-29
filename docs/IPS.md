# Future You — Investment Policy Statement (IPS) spec

*The IPS is the capstone deliverable: a clear, downloadable one-page plan the user keeps and revisits (VISION step 12; METHODOLOGY §11). This spec adapts professional IPS practice to Future You. Distilled from three references in [`references/ips/`](references/ips/): **CFA Institute** "Elements of an IPS for Individual Investors" (the framework), **Morgan Stanley** (a template skeleton), and **UBS Family Office** (goals-based "Liquidity · Longevity · Legacy" + checklist). Written 2026-06-29.*

## What an IPS is — and why it matters here
A plain, agreed statement of *what you're investing for, how much risk suits you, how your money is allocated, and what you'll do when markets wobble.* Its single most valuable role — per **both** CFA Institute and UBS — is **an objective course of action to follow during market drops, so emotion doesn't drive a costly mistake.** For a product whose mission is calm, informed investors, the IPS is where understanding becomes commitment.

## What we adapt vs. drop
Professional IPS docs assume an adviser, an investment committee, fiduciary/ERISA duties, proxy voting, manager hiring/removal, custody and quarterly reporting. **Future You is accountless, self-serve, and educational — not advice and not a brokerage** — so we **drop** governance / committee / fiduciary / adviser / proxy / securities-lending / manager-removal, and replace "standard of care / fiduciary" with our **educational-not-advice** disclaimer (VISION non-goals). We **keep the investor-centric substance**, in plain language.

## The Future You IPS — sections
Assembled entirely from the user's own plan data (profile, goals, risk profile, allocation, projection). **Every number comes from the engine (METHODOLOGY); nothing is invented** (DATA.md verification rule applies to any explanatory prose).

1. **Your plan at a glance** — one-line purpose + a headline ("A balanced plan for your home deposit and retirement") + the date.
2. **About you** — a short snapshot from your profile: who it's for, horizon(s), what matters most. *(CFAI "define the investor".)*
3. **What you're investing for** — each goal with its target, horizon, and how on-track it is. *(CFAI "overall objective + return requirement".)*
4. **How much risk suits you** — your **willingness** + **ability** → the binding profile, in plain words (METHODOLOGY §6), plus an honesty line: **"In a really bad year, this plan could fall about −X%"** — and that you're choosing it knowingly. *(CFAI risk tolerance + tolerable-loss threshold.)*
5. **Your constraints** — time horizon; near-term cash you'll need (liquidity); Swiss tax notes (pillar 3a, 35% withholding & reclaim, no capital-gains tax for private investors); anything you've chosen to exclude. *(CFAI constraints; UBS "risk tolerance & constraints".)*
6. **Your money, by timeframe (the buckets)** — a goals-based split adapted from UBS's **Liquidity · Longevity · Legacy**: *Soon* (safe, near-term needs), *Later* (long-horizon growth), *Beyond* (very-long / legacy, if any). Near-term needs are segmented on purpose — so a bear market never forces you to sell. *(UBS 3L; CFAI goals-based.)*
7. **Your target mix** — the strategic allocation: target weight per sleeve **with allowable ranges**, shown as the donut/treemap; the diversified core **plus your chosen holdings at their risk-adjusted weights** (METHODOLOGY §5, §7). *(CFAI "policy portfolio: targets + ranges".)*
8. **What to expect** — the projection cone + goal-funding probability, stated as a *range*, never false precision (DESIGN §12). *(CFAI return/distribution; UBS wealth projections.)*
9. **When to rebalance** — a simple upfront rule (drift bands and/or once a year) and the glide path as the goal nears — **decided now, not in reaction to markets.** *(CFAI §4c; UBS "rebalancing as policy upfront".)*
10. **When markets fall — your plan** — the behavioral anchor: a pre-agreed "in a downturn we do nothing rash; we stick to the plan; here's why that wins over time." *(CFAI + UBS: the IPS's most important role.)*
11. **Keeping it current** — revisit when life changes, or about once a year. *(CFAI review/update; MS "IPS review".)*
12. **The fine print** — educational, **not** personalized advice; FinSA-aware; no guarantees; all figures are model estimates.

## Format & tone
- A clean **downloadable one-pager (PDF)** plus an on-screen version; plain language a 15-year-old follows, with an optional **"show the detail"** for fuller numbers (VISION teaching layer; DESIGN §5).
- Built from the same design tokens — the PDF mirrors the app's look.
- No account needed; the same content is captured in the shareable read-only plan link.

## Build note (finalize in Claude Code)
The IPS is assembled by `app/ips` ⟶ TBD-in-CC from the plan response — **no new computation, no AI-invented facts**; any explanatory sentences follow the DATA.md number-verification rule. The PDF generator is chosen in Phase 5. The three reference PDFs in `references/ips/` are the ground-truth to match structure against.
