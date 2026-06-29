# Future You — Methodology & coverage map

*The financial methods, where each will live, how each maps to the CFA curriculum, and how each is defended. This is a **spec**: module paths and test names are finalized during Claude Code Phases 1–2 (marked **⟶ TBD-in-CC**). Pairs with [`VISION.md`](VISION.md) (the experience) and [`DATA.md`](DATA.md) (the inputs). Written 2026-06-29.*

## Standing rules
1. **Invisible in the app.** Every method is surfaced in plain, kid-simple language and is **never labelled "CFA"** or by theory name. The sophistication shows only as the *quality* of the advice (and, on demand, a clean equation + explanation — VISION "teaching layer").
2. **Defensible & verified.** Every formula has a **unit test** (known input → known output), and Chinguun (CFA L1) can explain each in an interview. **Depth you can defend beats maximal complexity.**
3. **Compute, don't guess.** Numbers come from the engine over real data (DATA.md) — never hand-typed, never AI-invented.

*Legend:* **module ⟶** planned location under `backend/` · **test ⟶** the known-answer unit test. Items tagged **[+]** are depth enhancements.

## 1. Returns & risk statistics
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Arithmetic **and** geometric mean | Quant — return measures | Geometric = the actual compounded experience; arithmetic overstates it | `core/moments` | mean of a known series |
| Variance / standard deviation | Quant | How bumpy the ride is | `core/moments` | vol of a 2-asset set = known |
| Covariance, correlation, corr→cov matrix | Quant / portfolio math | The engine of diversification | `core/moments` | symmetric; diagonal = vol² |
| Nearest positive-semidefinite repair | Numerical robustness | Keeps the risk model valid for optimisation | `core/moments` | repaired matrix is PSD |

## 2. Growth projections
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| FV lump sum `PV·(1+r)^n` | Quant — TVM | Compounding one amount over time | `core/projections` | known FV |
| FV regular contributions, **effective-monthly** | Quant — TVM | Monthly `i` with `(1+i)¹²=1+annual` — internally consistent | `core/projections` | annuity-FV known |
| **Monte-Carlo cone** — seeded paths → median + bands | Quant — simulation | A realistic *range*, not false precision | `core/projections` | seeded ⟶ reproducible percentiles |
| **Sequence-of-returns risk** [+] | Wealth | Order of returns matters once you're withdrawing | `core/projections` | bad-early ≠ bad-late |

## 3. Risk-adjusted analytics
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Sharpe `(Rp−Rf)/σ` | Portfolio mgmt | Return per unit of total risk | `core/analytics` | known inputs |
| Sortino (downside deviation) | Portfolio mgmt | Penalises only *downside* — what investors fear | `core/analytics` | known |
| Value-at-Risk (95%) | Risk | "A bad month could be about −X" | `core/analytics` | parametric known |
| Conditional VaR / Expected Shortfall | Risk | The average loss *in* the tail — more honest than VaR | `core/analytics` | CVaR ≥ VaR |
| Maximum drawdown | Risk | Worst peak-to-trough — the stomach test | `core/analytics` | known path |
| **Risk budgeting:** marginal & component contribution; diversification ratio [+] | Portfolio mgmt | *Which* holdings drive risk, not just their weight | `core/analytics` | CCRs sum to total vol |

## 4. Optimisation
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Markowitz efficient frontier (long-only, Σw=1) | Portfolio mgmt | The best return for each level of risk | `core/frontier` | frontier is concave |
| Tangency / max-Sharpe; Capital Market Line | CAPM / CML | The single best risk-adjusted mix | `core/frontier` | max-Sharpe ≥ sampled |

> **Estimation-error note.** Raw MVO is sensitive to input error, so we anchor on rule-based strategic allocation + published capital-market assumptions (MVO *informs*, doesn't dictate). Return shrinkage (Black-Litterman / James-Stein) is a deferred enhancement, not v1.

## 5. Investor views & tilts — "your picks at an adjusted weight"  *(centerpiece)*
The feature that makes it personal (VISION "I want NVIDIA"). Defensible, and **bounded** so it never becomes gambling.
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Blend user **views / tilts** onto the optimised core | Portfolio mgmt (Black-Litterman *in spirit*) | Respects what the user wants without abandoning rigor | `core/tilts` | tilt moves weight toward the pick, bounded |
| **Risk-based position sizing & caps** | Portfolio construction / risk budgeting | A riskier pick earns a *smaller* responsible weight; hard caps stop gambling | `core/tilts` | higher risk ⟶ lower cap; never exceeds max |
| Show the trade-off | Suitability | Always displays "optimal vs your mix" + the cost of the tilt | `core/tilts` | reports delta vs optimal |

> **Guardrails:** per-name and per-sleeve caps, a minimum diversified core, and the safe-universe screen (§10) — so "include what you want" never becomes "bet the plan."

## 6. Risk profiling
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| **Willingness** (attitude) vs **ability** (horizon, income stability, wealth) → take the **minimum** | Private wealth / behavioural | Never take more risk than the lower of the two allows | `core/risk_profiling` | the min binds |
| Score → profile bands (conservative … aggressive) | Private wealth | One suitable risk level | `core/risk_profiling` | band boundaries |

## 7. Strategic allocation
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Profile → sleeve weights (equity / bond / cash / diversifier) | SAA | The long-run policy mix does ~90% of the work | `core/allocation` | weights sum to 1 |
| **Core** (diversified ETFs) + **capped satellite** | Portfolio construction | Safe diversified core; small capped satellite for engagement | `core/allocation` | satellite ≤ cap |
| **Goals-based / liability-relative** [+] | Private wealth — goals-based | Soon-money invested safely; decades-money can take more | `core/allocation` | short vs long differ |
| **Glide path** [+] | Private wealth | De-risk as the goal/horizon approaches | `core/allocation` | risk ↓ as horizon ↓ |

> **Swiss tax/fee efficiency [+]:** prefer low-TER **UCITS** (tax-smart domicile), a **pillar-3a-first** funding order, and instruments that minimise withholding / stamp-duty drag ([`SWITZERLAND.md`](SWITZERLAND.md) §1–§3). Expressed in *instrument choice*, not trading — no private capital-gains tax means buy-and-hold.

## 8. Adaptive scenario detection  [+]
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Detect which planning needs apply from the profile (retirement, education, home, emergency fund, debt-vs-invest) | Private wealth — goals-based | Surfaces only what's relevant; no manual toggling | `core/scenarios` | profile ⟶ expected module set |

## 9. Retirement / decumulation
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Real rate via **Fisher** `(1+nom)/(1+inf)−1` | Economics | Spending power matters, not nominal francs | `core/retirement` | known |
| Capital-needs (PV of income, annuity-due) | Private wealth | How big the pot must be | `core/retirement` | known PV |
| Required-contribution solve (round-trip verified) | Quant — TVM | Turns a goal into "save this much per month" | `core/retirement` | solve ↔ FV inverse |
| **Safe-withdrawal + sequence stress** [+] | Private wealth | Survives a rough early retirement, not just an average one | `core/retirement` | stressed < average |

## 10. Safe-universe screen
| Method | CFA area | One-line defence | module ⟶ | test ⟶ |
|---|---|---|---|---|
| Quality rules: large-cap, profitable or established payer, long track record, low–moderate beta, index member; investment-grade for bonds | Suitability / prudent-investor | Defines "safe, not gambling" by rules — excludes micro-caps, recent IPOs, meme/high-vol names automatically | `core/screen` | known names pass/fail |

> **Swiss-aware (funds) [+]:** for ETFs the screen also requires **UCITS / KID-available**, **low TER**, sufficient AUM & age, physical replication preferred, and an acceptable **domicile** (Ireland / Luxembourg / CH) — UCITS-first, US-domiciled excluded by default. See [`SWITZERLAND.md`](SWITZERLAND.md) §1.

## 11. Investment Policy Statement (IPS)
The capstone deliverable on the summary screen: objective, risk, allocation, satellite, projection, retirement, disclaimers — downloadable. *(private wealth)* · `app/ips` ⟶ TBD-in-CC. **Full structure & sources: [`IPS.md`](IPS.md)** — distilled from the CFA Institute, Morgan Stanley & UBS templates in [`references/ips/`](references/ips/).

## Deliberately out of scope
Deep fixed-income & derivatives pricing, financial-statement modelling, corporate finance — not a fit for a personal long-term planner. Omitted to keep the product clear and honest, not from lack of coverage.

## Each method, in the UI
One friendly sentence + an analogy + an optional **"show the maths"**: a cleanly typeset (KaTeX) equation, each symbol explained in plain words, and a worked example using the user's own numbers. The maths is computed in the backend and unit-tested; the front-end only renders. (VISION "teaching layer"; DESIGN §5.)
