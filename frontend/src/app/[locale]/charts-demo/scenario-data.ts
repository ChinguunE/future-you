import {TILT_COST} from './allocation-data';
import {Z01, Z025, Z05, Z90} from './normal';
import {ASSET_POINTS, CORRELATIONS} from './risk-data';
import {
  ANNUAL_RATE,
  futureValue,
  HORIZON_YEARS,
  START_YEAR,
  type Horizon
} from './sample-data';

/**
 * SAMPLE scenario & comparison data for the dev-only charts demo (Slice 9, Wave E —
 * "Scenario & comparison"). Deterministic, NO live data and NO randomness — the real
 * numbers arrive from the engine in Phase 5. Like every other wave, all three cards are
 * DERIVED from the shared scenario so they can never disagree with the mix / growth /
 * risk charts:
 *   - your portfolio's (return, risk) = TILT_COST.tiltedReturn / tiltedRisk (5.5% / 10.4%);
 *   - the reference mixes are built from the SAME (risk, return) points the efficient
 *     frontier plots (VWCE.DE = a plain world-equity index, AGGS.SW = global bonds) and
 *     the SAME equity↔bond ρ the correlation heatmap uses;
 *   - the rough-year losses and the rolling band use the SAME closed-form normal (μ + zσ,
 *     σ/√n) the return-distribution card uses — E2 IS that card's band as a function of
 *     holding length;
 *   - the benchmark paths reuse the projection fan's OWN futureValue growth engine.
 *
 * HONESTY (DESIGN §12; CLAUDE.md non-negotiable #3): these are forward-looking, illustrative
 * scenarios, NOT a replay of any real crisis. We deliberately do NOT fabricate "2008 / 2020"
 * realized returns — the snapshot layer carries no historical-returns series, and inventing
 * those numbers would break "accuracy is sacred". Literal named-crisis stress bars are
 * DEFERRED until a real historical snapshot exists. Every figure here traces to a shared
 * constant above (whose ultimate provenance is the J.P. Morgan LTCMA CHF snapshot the
 * universe was seeded from). The shapes mirror the API contract in backend/app/api/schemas.py
 * (AnalyticsOut.worst_year_loss, ProjectionBandsOut, TiltCostOut); Phase 5's adapter maps the
 * snake_case engine output → these camelCase types. Invariants: a stressed year ≤ 0; your
 * cushioned fall is shallower than a plain index's; the rolling band narrows as the hold grows;
 * both benchmark paths share ONE growth formula.
 */

/* ------------------------------------------------------------------------- *
 * Reference building blocks — reused by E1 (a plain stock index) and E3 (60/40). *
 * ------------------------------------------------------------------------- */

/** Your portfolio's expected (return, risk) — straight from the tilt-cost summary. */
const YOUR = {
  return: TILT_COST.tiltedReturn, // 0.055
  risk: TILT_COST.tiltedRisk // 0.104
} as const;

// A plain world-equity index (VWCE.DE = FTSE All-World) and global bonds (AGGS.SW),
// reusing the SAME (risk, return) points as the efficient-frontier scatter, plus the
// SAME equity↔bond ρ as the correlation heatmap — so every reference mix agrees with
// the risk wave.
const EQUITY = ASSET_POINTS['VWCE.DE']; // { risk: 0.15, return: 0.065 } — a plain stock index
const BOND = ASSET_POINTS['AGGS.SW']; // { risk: 0.05, return: 0.02 } — global aggregate bonds
const RHO_EQ_BOND = CORRELATIONS['VWCE.DE|AGGS.SW']; // 0.15

/** A two-asset (equity + bond) reference mix's expected (return, risk). */
function referenceMix(equityWeight: number): {return: number; risk: number} {
  const wBond = 1 - equityWeight;
  const ret = equityWeight * EQUITY.return + wBond * BOND.return;
  const variance =
    equityWeight ** 2 * EQUITY.risk ** 2 +
    wBond ** 2 * BOND.risk ** 2 +
    2 * equityWeight * wBond * EQUITY.risk * BOND.risk * RHO_EQ_BOND;
  return {return: ret, risk: Math.sqrt(variance)};
}

/** A plain 100%-world-equity index (E1's deeper reference). */
const PLAIN_INDEX = referenceMix(1); // { return: 0.065, risk: 0.15 }
/** A classic 60/40 stocks/bonds mix (E3's reference). */
const BALANCED_60_40 = referenceMix(0.6); // { return: ~0.047, risk: ~0.095 }

/* ------------------------------------------------------------------------- *
 * E1 — "How a bad year could feel": rough-year loss bars.                     *
 *                                                                            *
 * A single bad YEAR's return is modelled Normal(μ, σ) (μ, σ the ARITHMETIC     *
 * expected return + one-year volatility). The loss at a rarity z is μ + zσ —     *
 * exactly the parametric VaR the engine's worst_year_loss uses. Three severities   *
 * (1-in-20 / 1-in-40 / 1-in-100) for YOUR mix vs a plain stock index, whose bigger   *
 * σ makes its fall deeper — so diversification's cushion is visible, never a crisis   *
 * replay. NOT the return-distribution card's horizon-averaged VaR (that divides σ by   *
 * √years); this is a single year, so it uses the full annual σ.                        *
 * ------------------------------------------------------------------------- */

export type StressSeverity = 'oneIn20' | 'oneIn40' | 'oneIn100';

export type StressBar = {
  /** the rarity key (the x category) */
  severity: StressSeverity;
  /** how rare — the negative tail multiplier z (−1.65 / −1.96 / −2.33) */
  z: number;
  /** your mix's fall that bad year (a negative fraction) */
  yourLoss: number;
  /** a plain stock index's fall that bad year (a deeper negative fraction) */
  indexLoss: number;
  /** yourLoss − indexLoss (> 0: your mix falls this many points less) */
  cushion: number;
};

export type StressSummary = {
  bars: StressBar[];
  /** the 1-in-20 fall for your mix — the engine's worst_year_loss (the headline) */
  worstYearLoss: number;
  /** how many points shallower your mix falls than a plain index in a 1-in-20 year (> 0) */
  headlineCushion: number;
  /** your mix's fall in a severe (1-in-100) year */
  severeLoss: number;
};

const SEVERITIES: ReadonlyArray<{key: StressSeverity; z: number}> = [
  {key: 'oneIn20', z: Z05}, // −1.645
  {key: 'oneIn40', z: Z025}, // −1.960
  {key: 'oneIn100', z: Z01} // −2.326
];

/** A single-year parametric loss (VaR) for a mix at a rarity z: return + z·risk. */
function stressLoss(point: {return: number; risk: number}, z: number): number {
  return point.return + z * point.risk;
}

/** The rough-year loss bars for your mix vs a plain stock index, at three severities. */
export function buildStressBars(): StressSummary {
  const bars: StressBar[] = SEVERITIES.map((s) => {
    const yourLoss = stressLoss(YOUR, s.z);
    const indexLoss = stressLoss(PLAIN_INDEX, s.z);
    return {severity: s.key, z: s.z, yourLoss, indexLoss, cushion: yourLoss - indexLoss};
  });
  const oneIn20 = bars[0];
  return {
    bars,
    worstYearLoss: oneIn20.yourLoss,
    headlineCushion: oneIn20.cushion,
    severeLoss: bars[2].yourLoss
  };
}

/* ------------------------------------------------------------------------- *
 * E2 — rolling returns: the range of ANNUALISED returns by holding length.    *
 *                                                                            *
 * The average yearly return over an n-year hold is Normal(μ, σ/√n): the median    *
 * stays at μ, but the spread SHRINKS with √n as good and bad years average out. So   *
 * the p10–p90 band is wide over 1 year and narrows to a tight neck over 10 — and its   *
 * lower edge (a rough run) rises above 0 past a break-even hold. Same μ, σ as the       *
 * return-distribution card (this IS its band, drawn against holding length).            *
 * ------------------------------------------------------------------------- */

export type RollingPoint = {
  /** holding length in years (the x value) */
  years: number;
  /** a rough run — the 10th-percentile annualised return */
  p10: number;
  /** the expected (median) annualised return — flat at μ */
  median: number;
  /** a good run — the 90th-percentile annualised return */
  p90: number;
};

export type RollingSummary = {
  /** the smooth band + median over 1..10 years (the chart) */
  curve: RollingPoint[];
  /** the canonical holds 1 / 3 / 5 / 10 years (the table + the dots) */
  marks: RollingPoint[];
  /** the hold length at which a rough run (p10) first clears 0% (break-even) */
  breakevenYears: number;
  /** μ — the expected annualised return, flat across every hold */
  mean: number;
  /** the one-year swing σ (for the maths) and the ten-year swing σ/√10 */
  oneYearSigma: number;
  tenYearSigma: number;
};

const MU = TILT_COST.tiltedReturn; // 0.055 — the same μ the return distribution uses
const SIGMA_ANNUAL = TILT_COST.tiltedRisk; // 0.104 — the same one-year σ

/** The p10 / median / p90 annualised return for an n-year hold. */
function rollingAt(years: number): RollingPoint {
  const sigma = SIGMA_ANNUAL / Math.sqrt(years);
  return {years, p10: MU - Z90 * sigma, median: MU, p90: MU + Z90 * sigma};
}

/** The rolling-return band (1..10y), the canonical holds, and the break-even hold. */
export function buildRolling(): RollingSummary {
  const curve: RollingPoint[] = [];
  for (let y = 1; y <= 10 + 1e-9; y += 0.5) curve.push(rollingAt(y));
  const marks = [1, 3, 5, 10].map(rollingAt);
  // p10 = μ − Z90·σ/√n = 0  ⟺  √n = Z90·σ/μ.
  const breakevenYears = (Z90 * SIGMA_ANNUAL / MU) ** 2;
  return {
    curve,
    marks,
    breakevenYears,
    mean: MU,
    oneYearSigma: SIGMA_ANNUAL,
    tenYearSigma: SIGMA_ANNUAL / Math.sqrt(10)
  };
}

/* ------------------------------------------------------------------------- *
 * E3 — benchmark comparison: your mix's expected path vs a 60/40 reference.    *
 *                                                                            *
 * Both are FORWARD projections (an expected path, never a track record), drawn with   *
 * the projection fan's OWN futureValue engine so your line is literally the fan's       *
 * median. Your path compounds at the fan's ~5% (the compound return, ≈ arithmetic         *
 * 5.5% − σ²/2); the reference gets the SAME haircut applied to its lower expected          *
 * return, so both lines share one formula and only the growth rate differs. The gap        *
 * (you − reference) is the honest "am I ahead of just buying a plain 60/40?" — and it       *
 * compounds with time. More expected return here comes with more risk (see E1/E2).          *
 * ------------------------------------------------------------------------- */

export type BenchmarkPoint = {
  /** calendar year (the x value) */
  year: number;
  /** your mix's median projected balance (CHF, rounded) — the projection fan's median */
  you: number;
  /** the 60/40 reference mix's median projected balance (CHF, rounded) */
  reference: number;
  /** you − reference (CHF, ≥ 0): how far ahead your mix's expected path runs */
  gap: number;
};

export type BenchmarkSummary = {
  points: BenchmarkPoint[];
  /** end-of-horizon balances + the gap (CHF, rounded) */
  yourFinal: number;
  referenceFinal: number;
  gap: number;
  /** the year the horizon ends */
  targetYear: number;
  /** expected annual returns + risks for the two mixes (fractions) — the trade-off */
  yourReturn: number;
  referenceReturn: number;
  yourRisk: number;
  referenceRisk: number;
};

const YOUR_RATE = ANNUAL_RATE; // 0.05 — your mix's compound growth (matches the fan)
// The reference's compound growth = the fan's rate scaled by the expected-return ratio,
// so both paths share ONE formula and your line stays exactly the projection fan's median.
const REF_RATE = ANNUAL_RATE * (BALANCED_60_40.return / YOUR.return); // ≈ 0.0427

/** Your mix's expected path vs the 60/40 reference path, over a horizon. */
export function buildBenchmark(horizon: Horizon): BenchmarkSummary {
  const years = HORIZON_YEARS[horizon];
  const points: BenchmarkPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const you = Math.round(futureValue(y * 12, YOUR_RATE));
    const reference = Math.round(futureValue(y * 12, REF_RATE));
    points.push({year: START_YEAR + y, you, reference, gap: you - reference});
  }
  const last = points[points.length - 1];
  return {
    points,
    yourFinal: last.you,
    referenceFinal: last.reference,
    gap: last.gap,
    targetYear: START_YEAR + years,
    yourReturn: YOUR.return,
    referenceReturn: BALANCED_60_40.return,
    yourRisk: YOUR.risk,
    referenceRisk: BALANCED_60_40.risk
  };
}
