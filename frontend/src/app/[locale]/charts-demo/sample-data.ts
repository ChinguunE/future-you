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
