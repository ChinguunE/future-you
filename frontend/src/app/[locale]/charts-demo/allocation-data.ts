/**
 * SAMPLE allocation / holdings data for the dev-only charts demo (Slice 9, Wave A —
 * "Your mix"). Deterministic, NO live data and NO randomness — the real numbers
 * arrive from the engine in Phase 5. The SHAPE mirrors the API contract in
 * backend/app/api/schemas.py (AllocationOut / HoldingOut / TiltCostOut); we use
 * idiomatic camelCase here (Phase 5's adapter maps the snake_case API → these types)
 * and add two convenience fields the charts need — `sleeve` and `assetClass` — that
 * a client derives from the flat holdings list.
 *
 * The scenario is a moderate-growth Swiss profile built from REAL instruments (see
 * public/data/universe.json + cma.json): four core UCITS funds (one per sleeve) plus
 * three satellite stock tilts. Every invariant the engine guarantees is honoured, so
 * the charts never draw a dishonest total:
 *   - sleeve weights sum to 1;   - holding weights sum to 1;
 *   - risk contributions sum to 1;   - core + satellite = 1;   - satellites ≤ 20%;
 *   - each satellite weight ≤ its cap (≤ 10%);   core caps are null.
 * Risk contribution deliberately DIVERGES from weight (high-beta NVDA is 6% of the
 * money but 22% of the risk) so the "by weight" and "by risk" treemaps tell genuinely
 * different, honest stories.
 */

export type Sleeve = "equity" | "bond" | "cash" | "diversifier"
export type HoldingRole = "core" | "satellite"

/** The asset-class keys used in this sample (a subset of cma.json's taxonomy). */
export type AssetClass =
  | "world_equity"
  | "us_equity"
  | "swiss_equity"
  | "europe_equity"
  | "global_agg_bonds"
  | "cash_chf"
  | "gold"

export type Holding = {
  /** real ticker (e.g. "VWCE.DE") */
  ticker: string
  /** short human name — a proper noun, identical in EN/FR */
  name: string
  /** the cma.json asset-class key; its label is localised in the page */
  assetClass: AssetClass
  /** which sleeve this holding sits in (derived; the engine groups by this) */
  sleeve: Sleeve
  role: HoldingRole
  /** capital share, 0..1 — sums to 1 across holdings */
  weight: number
  isSatellite: boolean
  /** the per-holding cap (satellites only); core funds are uncapped (null) */
  cap: number | null
  /** this holding's share of TOTAL portfolio risk, 0..1 — sums to 1 (percent_risk_contributions) */
  riskContribution: number
}

export type Sleeves = Record<Sleeve, number>

export type Allocation = {
  sleeves: Sleeves
  holdings: Holding[]
  /** total in the four core funds, and total in the satellite tilts (sum to 1) */
  coreWeight: number
  satelliteWeight: number
}

/** The optimal (pre-tilt policy) vs tilted (your) portfolio summary — from tilts.py. */
export type TiltCost = {
  /** expected annual return, as a fraction */
  optimalReturn: number
  tiltedReturn: number
  /** annual volatility, as a fraction */
  optimalRisk: number
  tiltedRisk: number
  /** return-per-unit-risk (illustrative) */
  optimalSharpe: number
  tiltedSharpe: number
}

/** Sleeve display order (matches backend/core/plan.py SLEEVE_ORDER). */
export const SLEEVE_ORDER: readonly Sleeve[] = [
  "equity",
  "bond",
  "cash",
  "diversifier",
] as const

/**
 * The sample holdings. Ordered core-first (like adapters.to_response): the four core
 * funds (uncapped, is_satellite = false), then the satellite tilts (capped, true).
 */
const HOLDINGS: readonly Holding[] = [
  {
    ticker: "VWCE.DE",
    name: "FTSE All-World",
    assetClass: "world_equity",
    sleeve: "equity",
    role: "core",
    weight: 0.44,
    isSatellite: false,
    cap: null,
    riskContribution: 0.52,
  },
  {
    ticker: "AGGS.SW",
    name: "Global Aggregate Bond",
    assetClass: "global_agg_bonds",
    sleeve: "bond",
    role: "core",
    weight: 0.25,
    isSatellite: false,
    cap: null,
    riskContribution: 0.06,
  },
  {
    ticker: "CSBGC3.SW",
    name: "CHF Money Market",
    assetClass: "cash_chf",
    sleeve: "cash",
    role: "core",
    weight: 0.1,
    isSatellite: false,
    cap: null,
    riskContribution: 0.0,
  },
  {
    ticker: "SGLN.L",
    name: "Physical Gold",
    assetClass: "gold",
    sleeve: "diversifier",
    role: "core",
    weight: 0.05,
    isSatellite: false,
    cap: null,
    riskContribution: 0.05,
  },
  {
    ticker: "NVDA",
    name: "NVIDIA",
    assetClass: "us_equity",
    sleeve: "equity",
    role: "satellite",
    weight: 0.06,
    isSatellite: true,
    cap: 0.1,
    riskContribution: 0.22,
  },
  {
    ticker: "NESN.SW",
    name: "Nestlé",
    assetClass: "swiss_equity",
    sleeve: "equity",
    role: "satellite",
    weight: 0.05,
    isSatellite: true,
    cap: 0.1,
    riskContribution: 0.06,
  },
  {
    ticker: "ASML.AS",
    name: "ASML",
    assetClass: "europe_equity",
    sleeve: "equity",
    role: "satellite",
    weight: 0.05,
    isSatellite: true,
    cap: 0.1,
    riskContribution: 0.09,
  },
] as const

/** Sum a numeric field over the holdings (used to derive sleeve totals honestly). */
function sumBy(pred: (h: Holding) => boolean, field: "weight" | "riskContribution") {
  return HOLDINGS.filter(pred).reduce((acc, h) => acc + h[field], 0)
}

/** The whole sample allocation — sleeves derived from the holdings so they always agree. */
export const ALLOCATION: Allocation = {
  sleeves: {
    equity: sumBy((h) => h.sleeve === "equity", "weight"),
    bond: sumBy((h) => h.sleeve === "bond", "weight"),
    cash: sumBy((h) => h.sleeve === "cash", "weight"),
    diversifier: sumBy((h) => h.sleeve === "diversifier", "weight"),
  },
  holdings: [...HOLDINGS],
  coreWeight: sumBy((h) => h.role === "core", "weight"),
  satelliteWeight: sumBy((h) => h.role === "satellite", "weight"),
}

/**
 * The tilt cost — tilting toward your three picks nudged expected return up a touch,
 * but added more risk, so return-per-unit-risk slips slightly. An honest small
 * trade-off (illustrative figures in the engine's spirit).
 */
export const TILT_COST: TiltCost = {
  optimalReturn: 0.052,
  tiltedReturn: 0.055,
  optimalRisk: 0.096,
  tiltedRisk: 0.104,
  optimalSharpe: 0.54,
  tiltedSharpe: 0.53,
}

/* ------------------------------------------------------------------------- *
 * Derived views for the charts. Each takes label resolvers so the page can    *
 * pass localised sleeve / asset-class text (holding names stay proper nouns). *
 * ------------------------------------------------------------------------- */

export type MixLabels = {
  root: string
  sleeve: (s: Sleeve) => string
  assetClass: (ac: AssetClass) => string
}

/** A nivo hierarchy node: a branch has `children`, a leaf has a numeric `value`. */
export type MixNode = {
  id: string
  /** the sleeve this node belongs to — drives its colour (never colour-alone: also labelled) */
  sleeve: Sleeve
  value?: number
  children?: MixNode[]
}

/**
 * The sunburst tree: root → sleeve → asset class → holding (leaf = weight). Nesting is
 * derived from each holding's sleeve + assetClass, exactly as a client would from the
 * flat API list. Ring luminance + direct labels distinguish levels (never colour-alone).
 */
export function buildSunburst(labels: MixLabels): MixNode {
  const sleeves = SLEEVE_ORDER.filter((s) => ALLOCATION.sleeves[s] > 0)
  return {
    id: labels.root,
    sleeve: "equity",
    children: sleeves.map((sleeve) => {
      const inSleeve = ALLOCATION.holdings.filter((h) => h.sleeve === sleeve)
      // Group the sleeve's holdings by asset class so the middle ring reads cleanly.
      const classes = [...new Set(inSleeve.map((h) => h.assetClass))]
      return {
        id: labels.sleeve(sleeve),
        sleeve,
        children: classes.map((ac) => ({
          id: labels.assetClass(ac),
          sleeve,
          children: inSleeve
            .filter((h) => h.assetClass === ac)
            .map((h) => ({ id: h.ticker, sleeve, value: h.weight })),
        })),
      }
    }),
  }
}

export type TreemapMetric = "weight" | "risk"

/** Flat treemap: root → one leaf per holding, sized by `weight` or `riskContribution`. */
export function buildTreemap(metric: TreemapMetric, rootLabel: string): MixNode {
  return {
    id: rootLabel,
    sleeve: "equity",
    children: ALLOCATION.holdings.map((h) => ({
      id: h.ticker,
      sleeve: h.sleeve,
      value: metric === "weight" ? h.weight : h.riskContribution,
    })),
  }
}

export type OptimalVsYou = {
  ticker: string
  name: string
  sleeve: Sleeve
  /** the pre-tilt policy weight (core scaled to sum 1, satellites at 0) */
  optimal: number
  /** your (tilted) weight */
  your: number
  /** your − optimal (over-weight ▲ / under-weight ▼) */
  delta: number
}

/**
 * "Your mix vs the optimal mix", per holding. The optimal (policy) mix holds only the
 * four core funds, scaled to sum to 1 (satellites at 0); your mix is the tilted book.
 * The deltas sum to ~0 — the satellites you added are funded by trimming the core.
 */
export function buildOptimalVsYou(): OptimalVsYou[] {
  const core = ALLOCATION.holdings.filter((h) => h.role === "core")
  const coreTotal = core.reduce((acc, h) => acc + h.weight, 0)
  return ALLOCATION.holdings.map((h) => {
    const optimal = h.role === "core" ? h.weight / coreTotal : 0
    return {
      ticker: h.ticker,
      name: h.name,
      sleeve: h.sleeve,
      optimal,
      your: h.weight,
      delta: h.weight - optimal,
    }
  })
}
