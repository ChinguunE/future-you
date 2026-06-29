# Future You — Switzerland optimization

*Future You is built for a Swiss resident (Chinguun's family, Geneva). This spec captures the Swiss-specific choices that make it tax-smart, low-fee, and easy — woven through the **universe**, the **allocation**, and the **"How to invest"** guidance. Educational, **not advice**; FinSA-aware. Figures are **2026** — cite + date them in-app and refresh annually. Pairs with [`DATA.md`](DATA.md), [`METHODOLOGY.md`](METHODOLOGY.md), [`VISION.md`](VISION.md). Written 2026-06-29.*

## Why this matters
A plan that looks "optimal" in the abstract can be poor for a Swiss investor once **fund domicile, tax, and fees** are considered. We bake the Swiss reality in rather than bolting on a tax page.

## 1. A Swiss-appropriate universe (UCITS-first, not US-domiciled)

> **"Swiss-appropriate" describes the fund's *wrapper*, not its *holdings*.** The portfolio is **globally diversified** by exposure — world / US / Europe / emerging-market equity and global bonds — **not Swiss-only**. "UCITS-first" means the **domicile, structure, tradability and tax treatment** suit a Swiss resident: a fund can be **Irish-domiciled, hold global stocks, and trade in CHF on SIX** all at once. Any **home (Swiss) tilt stays modest** and deliberate (e.g. a little CHF for near-term needs) — over-concentration in one's home market is a bias we deliberately avoid.

- Default to **UCITS ETFs (Ireland / Luxembourg-domiciled)** — they carry the **KID** Swiss law requires and are cleanly buyable by Swiss retail. US-domiciled ETFs lack a KID (generally **execution-only**, e.g. via Interactive Brokers) and expose non-residents to **US estate tax** (above ~USD 60k) — so they are **not** the default.
- **Popular exposures are fully available — delivered via the UCITS equivalent.** Want the **S&P 500**? → an S&P 500 UCITS ETF (e.g. iShares **CSPX**, Vanguard **VUAA**). Want the **Nasdaq-100**? → e.g. Invesco **EQQQ** or iShares **CNDX**. Same index, same companies as the US-domiciled SPY/QQQ — just the wrapper a Swiss resident can actually buy, and usually more tax-efficient. The user gets the exposure they asked for and the app **explains** the vehicle choice; it never silently restricts. *(If someone specifically wants the US-domiciled ticker, we're honest that it's generally execution-only for Swiss retail and that the UCITS version achieves the same thing more efficiently.)*
- **Tax-smart domicile:** an **Irish-domiciled** UCITS holding US stocks pays **15%** US withholding at the fund level (US–Ireland treaty) instead of 30% for many non-treaty structures — the single biggest dividend-tax saving. *(Switzerland does have a US treaty, so US-domiciled is defensible with a W-8BEN + DA-1; UCITS-Irish is simply the cleaner, safer default.)*
- Screen funds for **low TER, sufficient AUM/age, physical replication (preferred), and a CHF/EUR/USD trading line on SIX where possible.** Reference data (TER, domicile, ISIN, distribution policy) comes from **justETF / Swiss Fund Data (SIX)**-grade sources (DATA.md) — not scraped guesses.

## 2. Tax — private investor, 2026
- **No capital-gains tax** for private investors (federal + cantonal): realized gains are **tax-free**. → advice leans **buy-and-hold**; we don't tax-optimize trading. *(Caveat surfaced in-app: heavy turnover/leverage can trigger "professional securities dealer" status and forfeit the exemption.)*
- **Dividends are taxable income.** Honest nuance for CH: **accumulating** ETFs do **not** dodge this — reinvested dividends are still taxed, and ESTV's **ICTax** lists the taxable amount per fund — but accumulating reduces admin. We show dividend income plainly.
- **Foreign withholding → reclaim via the DA-1 form** on the tax return (worth it above ~CHF 100 of non-reclaimable tax); the Swiss 35% anticipatory tax is reclaimed via the return. The app **reminds and explains** DA-1.
- **Pillar 3a** (tax-deductible): **2026 max CHF 7,258** (employee) / CHF 36,288 (self-employed without a pension fund); from 2026, **retroactive top-up buy-ins** are allowed. 3a is the **first bucket we suggest filling** — *invested*, not left as cash, in a low-fee 3a, glided down near withdrawal.
- **Stamp duty (Umsatzabgabe / droit de timbre):** Swiss securities dealers charge ~**0.075%** (Swiss securities) / **0.15%** (foreign) per trade; **foreign brokers don't** — a real, explained cost difference.

## 3. Fees & brokers — a framework, not a recommendation
- **Minimise:** fund **TER**, trading commissions, **stamp duty** (Swiss brokers), custody fees, and **FX spreads**.
- **Categories** (examples, *not* endorsements): Swiss banks/brokers (Swissquote, PostFinance, Saxo), neobrokers (Yuh, neon), foreign brokers (Interactive Brokers — no Swiss stamp duty, tight FX), and **pillar-3a apps** (VIAC, finpension, frankly, Truewealth). Trade-offs: cost vs convenience vs stamp-duty vs deposit protection. We give the framework + a pointer to a current comparison (e.g. moneyland.ch) — never a single "buy this."

## 4. Easy to start & to withdraw
- A plain **"how to actually start"** path: choose a broker / 3a, open the account, fund in **CHF**, buy the plan's ETFs, set a **standing monthly contribution**, and set the DA-1 / tax-return reminders.
- **3a withdrawal** explained simply: stagger withdrawals across tax years to lower the one-off withdrawal tax; note cantonal differences.

## 5. How the app uses all this
- The **universe** is UCITS-first (DATA.md, METHODOLOGY §10). The **allocation** prefers tax-/fee-efficient instruments and a **3a-first** ordering (METHODOLOGY §7). The **"How to invest in Switzerland"** screen (VISION step 11) delivers §2–§4 in plain, **bilingual (EN/FR)** language. Every figure is **cited, dated, and flagged educational-not-advice** (FinSA-aware).

## Sources (verify + date in-app; refresh annually)
Pillar 3a 2026 (UBS / AXA / official); DA-1 & withholding (Truewealth / VIAC / ESTV ICTax); no private CGT (PwC tax summaries / Taxolution); UCITS vs US domicile & PRIIPs/KID + Irish-domicile withholding (The Poor Swiss / EU Personal Finance / Bogleheads); fund reference data (justETF, Swiss Fund Data / SIX). Full links in the session's Sources.
