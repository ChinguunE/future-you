import type {DrawdownPoint} from '@/components/charts/drawdown-chart';
import type {ProjectionPoint} from '@/components/charts/growth-projection-chart';

/**
 * SAMPLE projection data for the dev-only charts demo — computed with a closed
 * form (compound future value + a band that widens with the square root of time),
 * NO live data and NO randomness. Real projections arrive from the engine in Phase
 * 5; this exists purely to prove the chart-theme + ChartCard. It is deliberately
 * shaped honestly (a widening fan around a median, never a single false line).
 */

export type Horizon = 'short' | 'medium' | 'long';

export const HORIZON_YEARS: Record<Horizon, number> = {
  short: 5,
  medium: 15,
  long: 30
};

/** A fixed goal (CHF) — reachable on the long horizon, a stretch on the short one. */
export const GOAL_VALUE = 100_000;

const START_YEAR = 2026;
const PRINCIPAL = 10_000; // what you start with
const MONTHLY = 300; // what you add each month
const ANNUAL_RATE = 0.05; // ~5% a year
const VOL = 0.08; // spread proxy; the band = median * (1 ± VOL*sqrt(years))

/** Compound future value of a lump sum plus a monthly contribution. */
function futureValue(months: number): number {
  const r = ANNUAL_RATE / 12;
  if (months === 0) return PRINCIPAL;
  const growth = (1 + r) ** months;
  return PRINCIPAL * growth + MONTHLY * ((growth - 1) / r);
}

/** Build the median + p10/p90 band for a horizon (short/medium/long). */
export function buildProjection(horizon: Horizon): ProjectionPoint[] {
  const years = HORIZON_YEARS[horizon];
  const points: ProjectionPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const median = futureValue(y * 12);
    const spread = VOL * Math.sqrt(y); // 0 at today, widens with time
    points.push({
      year: START_YEAR + y,
      p10: Math.round(median * (1 - spread)),
      median: Math.round(median),
      p90: Math.round(median * (1 + spread))
    });
  }
  return points;
}

/* ------------------------------------------------------------------------- *
 * Drawdown ("underwater") sample — Slice 8b.                                 *
 *                                                                            *
 * Same spirit as the projection above: illustrative, deterministic, NO live  *
 * data and NO randomness. A monthly invested-value path = a steady upward     *
 * drift MINUS two scripted market shocks (a big one + a smaller one) + a      *
 * gentle sine texture, so the running-peak drawdown has realistic dips and    *
 * recoveries — the "stomach test". Real paths arrive from the engine in       *
 * Phase 5; this exists only to prove the chart. The shock depth is targeted   *
 * (not the raw amplitude) so every horizon tells a comparable ~-30% story.    *
 * ------------------------------------------------------------------------- */

export type DrawdownSummary = {
  /** the deepest drawdown reached (the most-negative fraction) */
  maxDrawdown: number;
  /** where that trough sits (x + year) */
  troughT: number;
  troughYear: number;
  /** the peak it is measured from, and the trough value itself (CHF, rounded) */
  peakValue: number;
  troughValue: number;
  /** the underwater episode: the peak it fell from → back to that peak */
  startT: number;
  recoveryT: number;
  /** did it climb back to a new high within the horizon? */
  recovered: boolean;
};

const DD_START_VALUE = 10_000; // an illustrative starting invested value (CHF)
const DD_DRIFT = 0.06; // ~6% a year of upward drift

// center + width are FRACTIONS of the horizon so each timeframe tells a similar
// story; `depth` is the drawdown we aim for (the raw amplitude is derived from it
// and the width, keeping the deepest fall ~comparable across horizons).
const DD_SHOCKS = [
  {center: 0.34, width: 0.05, depth: 0.26}, // the big drop (lands ~ -33%)
  {center: 0.7, width: 0.045, depth: 0.12} // a smaller wobble, later
] as const;

type DdResolvedShock = {center: number; width: number; amp: number};

/** A gaussian shock's peak amplitude that yields ~`depth` over its down-phase. */
function ddResolveShocks(months: number): DdResolvedShock[] {
  return DD_SHOCKS.map((s) => {
    const width = s.width * months;
    // ∫ amp·exp(-x²) over the down-phase ≈ amp·width·√π/2 ≈ -ln(1 - depth).
    const amp = (-2 * Math.log(1 - s.depth)) / (width * Math.sqrt(Math.PI));
    return {center: s.center * months, width, amp};
  });
}

/** A deterministic monthly return: drift + gentle texture − any active shock. */
function ddMonthlyReturn(month: number, shocks: DdResolvedShock[]): number {
  const drift = (1 + DD_DRIFT) ** (1 / 12) - 1;
  const texture =
    0.005 * Math.sin((2 * Math.PI * month) / 8) +
    0.0035 * Math.sin((2 * Math.PI * month) / 21);
  let shock = 0;
  for (const s of shocks) {
    const x = (month - s.center) / s.width;
    shock += s.amp * Math.exp(-x * x);
  }
  return drift + texture - shock;
}

/** Build the underwater (drawdown) series + its summary for a horizon. */
export function buildDrawdown(horizon: Horizon): {
  points: DrawdownPoint[];
  summary: DrawdownSummary;
} {
  const months = HORIZON_YEARS[horizon] * 12;
  const shocks = ddResolveShocks(months);
  const points: DrawdownPoint[] = [];
  const raw: number[] = []; // unrounded values, for accurate peak-time search
  let value = DD_START_VALUE;
  let peak = DD_START_VALUE;
  for (let m = 0; m <= months; m++) {
    if (m > 0) value *= 1 + ddMonthlyReturn(m, shocks);
    if (value > peak) peak = value;
    raw.push(value);
    points.push({
      t: START_YEAR + m / 12,
      year: START_YEAR + Math.floor(m / 12),
      value: Math.round(value),
      peak: Math.round(peak),
      drawdown: value / peak - 1
    });
  }

  // The trough = the deepest drawdown.
  let troughIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].drawdown < points[troughIdx].drawdown) troughIdx = i;
  }
  const peakLevel = raw[troughIdx] / (points[troughIdx].drawdown + 1); // = the peak
  // The peak it fell from (last month at that high before the trough)…
  let startIdx = troughIdx;
  for (let i = troughIdx; i >= 0; i--) {
    if (raw[i] >= peakLevel - 1e-6) {
      startIdx = i;
      break;
    }
  }
  // …and the first climb back to that high afterwards (else the horizon end).
  let recoveryIdx = points.length - 1;
  let recovered = false;
  for (let i = troughIdx; i < points.length; i++) {
    if (raw[i] >= peakLevel - 1e-6) {
      recoveryIdx = i;
      recovered = true;
      break;
    }
  }

  const trough = points[troughIdx];
  return {
    points,
    summary: {
      maxDrawdown: trough.drawdown,
      troughT: trough.t,
      troughYear: trough.year,
      peakValue: trough.peak,
      troughValue: trough.value,
      startT: points[startIdx].t,
      recoveryT: points[recoveryIdx].t,
      recovered
    }
  };
}
