/**
 * Shared standard-normal helpers for the dev-only charts demo — pure, deterministic,
 * NO sampling. Hoisted into one module so every surface reads the SAME bell and no two
 * can disagree: the growth gauge (sample-data), the return distribution (risk-data) and
 * the scenario cards (scenario-data) all import from here. The CDF is the Zelen & Severo
 * rational approximation (Abramowitz & Stegun 26.2.17), accurate to ~7.5e-8.
 */

/** Standard-normal pdf, φ(z) = e^{−z²/2} / √(2π). */
export function normalPdf(z: number): number {
  return 0.3989422804014327 * Math.exp((-z * z) / 2);
}

/**
 * Standard-normal CDF Φ(x) — the probability a standard normal lands at or below x.
 * The same closed form the growth gauge and the return distribution both use.
 */
export function normalCdf(x: number): number {
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

/**
 * Selected standard-normal quantiles zₚ = Φ⁻¹(p), the "how far into the tail" multipliers
 * used across the demo. The band half-width Z90 ties the p10/p90 fan; the negative
 * quantiles are the rarity of a bad year (1-in-20 / 1-in-40 / 1-in-100).
 */
export const Z90 = 1.2815515594457412; // 90th percentile — the p10/p90 band half-width
export const Z05 = -1.6448536269514722; // 5th percentile — a 1-in-20 bad year
export const Z025 = -1.9599639845400545; // 2.5th percentile — a 1-in-40 bad year
export const Z01 = -2.3263478740408408; // 1st percentile — a 1-in-100 bad year

/** φ(z₀.₀₅) — feeds the expected-shortfall (CVaR) closed form in risk-data. */
export const PHI_Z05 = normalPdf(Z05);
