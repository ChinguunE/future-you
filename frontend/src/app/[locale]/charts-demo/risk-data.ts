import {ALLOCATION, TILT_COST, type Holding, type Sleeve} from './allocation-data';
import {HORIZON_YEARS, type Horizon} from './sample-data';

/**
 * SAMPLE risk data for the dev-only charts demo (Slice 9, Wave C — "Your risk").
 * Deterministic, NO live data and NO randomness — the real numbers arrive from the
 * engine in Phase 5. Every series is DERIVED from the SAME scenario the other waves
 * use (the Wave-A holdings + the tilt-cost return/risk figures), so the risk charts
 * can never disagree with the mix / growth charts:
 *   - the return distribution is Normal(μ = your expected return, σ = your volatility);
 *   - the risk-contribution bars reuse each holding's weight + risk share verbatim;
 *   - the efficient frontier is anchored on the optimal + tilted (return, risk) points.
 * The shapes mirror the API contract in backend/app/api/schemas.py; Phase 5's adapter
 * maps the snake_case engine output → these camelCase types.
 */

/* ------------------------------------------------------------------------- *
 * Shared normal helpers (pure, deterministic — NO sampling).                 *
 * ------------------------------------------------------------------------- */

/** Standard-normal pdf, φ(z) = e^{−z²/2} / √(2π). */
function normalPdf(z: number): number {
  return 0.3989422804014327 * Math.exp((-z * z) / 2);
}

/**
 * Standard-normal CDF via the Zelen & Severo rational approximation (Abramowitz &
 * Stegun 26.2.17), accurate to ~7.5e-8 — the same closed form the growth gauge uses,
 * so both surfaces read the SAME normal (see sample-data.ts).
 */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const phi = normalPdf(x);
  const tail =
    phi *
    t *
    (0.319381530 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - tail : tail;
}

/* ------------------------------------------------------------------------- *
 * C1 — return distribution with a VaR / CVaR tail.                           *
 *                                                                            *
 * We model the AVERAGE yearly return over the holding period as Normal(μ, σ_h),  *
 * μ = your expected return, σ_h = your annual volatility ÷ √years. The longer      *
 * you hold, the more good and bad years average out, so σ_h SHRINKS and the tail    *
 * pulls in — the honest case for a long horizon. VaR₉₅ is the 1-in-20 bad year;     *
 * CVaR₉₅ (expected shortfall) is the AVERAGE of that worst 5%. Both closed-form.     *
 * ------------------------------------------------------------------------- */

/** μ and annual σ of YOUR portfolio, straight from the tilt-cost summary. */
const MU = TILT_COST.tiltedReturn; // 0.055
const SIGMA_ANNUAL = TILT_COST.tiltedRisk; // 0.104

/** The 5% tail. z₀.₀₅ = Φ⁻¹(0.05); φ(z₀.₀₅) feeds the expected-shortfall (CVaR) form. */
const TAIL_ALPHA = 0.05;
const Z05 = -1.6448536269514722;
const PHI_Z05 = normalPdf(Z05); // ≈ 0.10313

export type ReturnBin = {
  /** the bin's mid return (a fraction, e.g. -0.08) — the x value */
  mid: number;
  /** probability mass in the bin (0..1) — the bar height; the bins sum to ~1 */
  mass: number;
  /** the worst-5% tail (mid at/below VaR) — shaded as the downside, never colour-alone */
  isTail: boolean;
};

export type ReturnDistribution = {
  bins: ReturnBin[];
  /** the expected (mean) yearly return over the horizon — the centre of the bell */
  mean: number;
  /** the annualised volatility for this horizon (σ ÷ √years) */
  sigma: number;
  /** Value-at-Risk: the worst yearly return you'd expect 19 years in 20 (a fraction, ≤ 0 here) */
  var95: number;
  /** Conditional VaR / expected shortfall: the AVERAGE return across that worst 5% */
  cvar95: number;
  /** the year the horizon ends (for labels) */
  targetYear: number;
};

const START_YEAR = 2026;
const BIN_COUNT = 23; // odd, so a bin is centred on the mean

/** The return distribution + its VaR/CVaR tail for a horizon (short/medium/long). */
export function buildReturnDistribution(horizon: Horizon): ReturnDistribution {
  const years = HORIZON_YEARS[horizon];
  const sigma = SIGMA_ANNUAL / Math.sqrt(years); // annualised-average σ narrows with time
  const var95 = MU + Z05 * sigma; // the 1-in-20 bad year
  const cvar95 = MU - (sigma * PHI_Z05) / TAIL_ALPHA; // the average of that worst 5%

  // Span a symmetric ±4σ window so the whole bell + its tail are visible; the window
  // shrinks with the horizon, which is exactly the story (the range of yearly outcomes
  // tightens the longer you hold).
  const lo = MU - 4 * sigma;
  const hi = MU + 4 * sigma;
  const width = (hi - lo) / BIN_COUNT;

  const bins: ReturnBin[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const left = lo + i * width;
    const right = left + width;
    const mid = (left + right) / 2;
    // Exact probability mass in the bin = Φ(right) − Φ(left) (no sampling).
    const mass =
      normalCdf((right - MU) / sigma) - normalCdf((left - MU) / sigma);
    bins.push({mid, mass, isTail: mid <= var95});
  }

  return {
    bins,
    mean: MU,
    sigma,
    var95,
    cvar95,
    targetYear: START_YEAR + years
  };
}

/* ------------------------------------------------------------------------- *
 * C2 — correlation heatmap.                                                  *
 *                                                                            *
 * A fixed, symmetric pairwise-correlation matrix over the SAME seven holdings   *
 * as Wave A. Illustrative but realistic: the equity holdings move closely         *
 * together, bonds/cash barely move with stocks, and gold leans slightly the        *
 * other way — the diversification story. Stored as a sparse upper-triangle map      *
 * keyed "TICKER_A|TICKER_B" (A before B in HOLDINGS order); the diagonal is 1.       *
 * ------------------------------------------------------------------------- */

/** ρ for a pair, keyed by the two tickers in HOLDINGS order (upper triangle only). */
const CORRELATIONS: Record<string, number> = {
  'VWCE.DE|AGGS.SW': 0.15,
  'VWCE.DE|CSBGC3.SW': 0.0,
  'VWCE.DE|SGLN.L': -0.1,
  'VWCE.DE|NVDA': 0.78,
  'VWCE.DE|NESN.SW': 0.62,
  'VWCE.DE|ASML.AS': 0.8,
  'AGGS.SW|CSBGC3.SW': 0.3,
  'AGGS.SW|SGLN.L': 0.2,
  'AGGS.SW|NVDA': 0.05,
  'AGGS.SW|NESN.SW': 0.18,
  'AGGS.SW|ASML.AS': 0.08,
  'CSBGC3.SW|SGLN.L': 0.05,
  'CSBGC3.SW|NVDA': 0.0,
  'CSBGC3.SW|NESN.SW': 0.02,
  'CSBGC3.SW|ASML.AS': 0.0,
  'SGLN.L|NVDA': -0.12,
  'SGLN.L|NESN.SW': 0.05,
  'SGLN.L|ASML.AS': -0.08,
  'NVDA|NESN.SW': 0.45,
  'NVDA|ASML.AS': 0.72,
  'NESN.SW|ASML.AS': 0.5
};

export type CorrelationEntity = {
  ticker: string;
  /** short human name (proper noun, identical EN/FR) */
  name: string;
  sleeve: Sleeve;
};

export type CorrelationCell = {
  row: number;
  col: number;
  /** ρ ∈ [−1, 1]; 1 on the diagonal */
  value: number;
  /** the diagonal (a holding with itself) — always 1, shown muted */
  isSelf: boolean;
};

export type CorrelationMatrix = {
  entities: CorrelationEntity[];
  cells: CorrelationCell[];
  /** the least-correlated pair (the best diversifier) */
  mostDiversifying: {a: CorrelationEntity; b: CorrelationEntity; value: number};
  /** the most-correlated distinct pair (the biggest overlap) */
  mostConcentrated: {a: CorrelationEntity; b: CorrelationEntity; value: number};
};

/** How to describe a correlation in words — the SINGLE source both the heatmap cells
 *  and its table read, so the tint, the spoken label, and the table never disagree. */
export type CorrelationRelation = 'together' | 'apart' | 'unrelated';
export function correlationRelation(value: number): CorrelationRelation {
  if (value >= 0.2) return 'together';
  if (value <= -0.05) return 'apart';
  return 'unrelated';
}

/** ρ between two holdings by index (symmetric; diagonal = 1). */
function corr(entities: CorrelationEntity[], i: number, j: number): number {
  if (i === j) return 1;
  const a = entities[i].ticker;
  const b = entities[j].ticker;
  return CORRELATIONS[`${a}|${b}`] ?? CORRELATIONS[`${b}|${a}`] ?? 0;
}

/** The full N×N correlation matrix + the standout (most/least correlated) pairs. */
export function buildCorrelationMatrix(): CorrelationMatrix {
  const entities: CorrelationEntity[] = ALLOCATION.holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    sleeve: h.sleeve
  }));

  const cells: CorrelationCell[] = [];
  let mostDiv = {i: 0, j: 1, value: Infinity};
  let mostCon = {i: 0, j: 1, value: -Infinity};
  for (let i = 0; i < entities.length; i++) {
    for (let j = 0; j < entities.length; j++) {
      const value = corr(entities, i, j);
      cells.push({row: i, col: j, value, isSelf: i === j});
      // Scan the upper triangle only (each distinct pair once) for the extremes.
      if (j > i) {
        if (value < mostDiv.value) mostDiv = {i, j, value};
        if (value > mostCon.value) mostCon = {i, j, value};
      }
    }
  }

  return {
    entities,
    cells,
    mostDiversifying: {
      a: entities[mostDiv.i],
      b: entities[mostDiv.j],
      value: mostDiv.value
    },
    mostConcentrated: {
      a: entities[mostCon.i],
      b: entities[mostCon.j],
      value: mostCon.value
    }
  };
}

/* ------------------------------------------------------------------------- *
 * C3 — risk contribution vs weight.                                          *
 *                                                                            *
 * Reuses each holding's capital weight + its share of TOTAL portfolio risk       *
 * (both already in ALLOCATION), ranked by risk so the biggest risk driver leads.   *
 * The "risk per franc" ratio (risk share ÷ weight) is the punch-line: a small       *
 * high-beta position can carry far more risk than its money share — the same          *
 * divergence the treemap toggles between, shown here side-by-side and rankable.        *
 * ------------------------------------------------------------------------- */

export type RiskContributionDatum = {
  ticker: string;
  name: string;
  sleeve: Sleeve;
  /** capital share, 0..1 */
  weight: number;
  /** share of total portfolio risk, 0..1 */
  risk: number;
  /** risk share ÷ weight — >1 punches above its weight, <1 below */
  ratio: number;
};

/** Weight + risk share per holding, ranked by risk (biggest driver first). */
export function buildRiskContribution(): RiskContributionDatum[] {
  return ALLOCATION.holdings
    .map((h: Holding) => ({
      ticker: h.ticker,
      name: h.name,
      sleeve: h.sleeve,
      weight: h.weight,
      risk: h.riskContribution,
      ratio: h.weight > 0 ? h.riskContribution / h.weight : 0
    }))
    .sort((a, b) => b.risk - a.risk);
}

/** The single holding carrying the most risk per franc (the headline driver). */
export function topRiskDriver(): RiskContributionDatum {
  return buildRiskContribution().reduce((a, b) => (b.ratio > a.ratio ? b : a));
}

/* ------------------------------------------------------------------------- *
 * C4 — efficient frontier with "you are here".                              *
 *                                                                            *
 * The curve of the best expected return for each level of risk, anchored so it     *
 * passes through BOTH the optimal and your tilted (risk, return) points from the     *
 * tilt-cost summary — a concave saturating form, return(σ) = rMax·σ / (σ + h). The    *
 * optimal mix sits at the best return-per-risk (steepest ray from the origin); your    *
 * tilted mix sits a little further along, where each extra unit of risk pays less —      *
 * the honest cost of tilting. Single holdings are plotted as faint dots (a lone          *
 * holding is riskier per unit of return than the diversified frontier).                   *
 * ------------------------------------------------------------------------- */

export type FrontierPoint = {risk: number; return: number};

export type FrontierAsset = FrontierPoint & {
  ticker: string;
  name: string;
  sleeve: Sleeve;
};

export type EfficientFrontier = {
  /** the frontier curve, low-risk → high-risk */
  curve: FrontierPoint[];
  /** the optimal (best return-per-risk) mix, on the curve */
  optimal: FrontierPoint;
  /** your tilted mix ("you are here") */
  you: FrontierPoint;
  /** single-holding context dots (inefficient on their own) */
  assets: FrontierAsset[];
};

// The two anchor points (risk, return), straight from the tilt-cost summary.
const OPT: FrontierPoint = {
  risk: TILT_COST.optimalRisk,
  return: TILT_COST.optimalReturn
};
const YOU: FrontierPoint = {
  risk: TILT_COST.tiltedRisk,
  return: TILT_COST.tiltedReturn
};

// return(σ) = rMax·σ / (σ + h), solved to pass through OPT and YOU (concave: each extra
// unit of risk buys less return, so the ray from the origin is steepest at low risk).
const FRONTIER_H =
  (OPT.risk * YOU.risk * (YOU.return - OPT.return)) /
  (OPT.return * YOU.risk - YOU.return * OPT.risk);
const FRONTIER_RMAX = (OPT.return * (OPT.risk + FRONTIER_H)) / OPT.risk;

function frontierReturn(risk: number): number {
  return (FRONTIER_RMAX * risk) / (risk + FRONTIER_H);
}

/** Illustrative single-holding (risk, return) points — riskier per unit of return. */
const ASSET_POINTS: Record<string, FrontierPoint> = {
  'VWCE.DE': {risk: 0.15, return: 0.065},
  'AGGS.SW': {risk: 0.05, return: 0.02},
  'CSBGC3.SW': {risk: 0.008, return: 0.005},
  'SGLN.L': {risk: 0.15, return: 0.03},
  NVDA: {risk: 0.34, return: 0.1},
  'NESN.SW': {risk: 0.16, return: 0.05},
  'ASML.AS': {risk: 0.28, return: 0.082}
};

const FRONTIER_SAMPLES = 40;

/** The efficient frontier: the curve, the optimal + your points, and the asset dots. */
export function buildFrontier(): EfficientFrontier {
  // Sample the curve from just above 0 out past the riskiest single holding.
  const maxRisk = Math.max(...Object.values(ASSET_POINTS).map((a) => a.risk));
  const curve: FrontierPoint[] = [];
  for (let i = 0; i <= FRONTIER_SAMPLES; i++) {
    const risk = (maxRisk * i) / FRONTIER_SAMPLES;
    curve.push({risk, return: frontierReturn(risk)});
  }

  const assets: FrontierAsset[] = ALLOCATION.holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    sleeve: h.sleeve,
    ...ASSET_POINTS[h.ticker]
  }));

  return {curve, optimal: OPT, you: YOU, assets};
}
