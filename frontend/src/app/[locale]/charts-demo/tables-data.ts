import {
  ALLOCATION,
  type AssetClass,
  type HoldingRole,
  type Sleeve
} from './allocation-data';
import {shock} from './noise';
import {ASSET_POINTS} from './risk-data';

/**
 * SAMPLE data for the dev-only charts demo (Slice 9, Wave F — "Your holdings, first-class
 * tables"). Deterministic, NO live data and NO randomness — the real numbers arrive from
 * the engine + snapshots in Phase 5. Every row is DERIVED from the SAME scenario the other
 * waves use (the Wave-A holdings) so the tables can never disagree with the mix / risk
 * charts:
 *   - weight + risk share come straight from ALLOCATION.holdings (verbatim, like Wave C);
 *   - each sparkline is a tiny illustrative price walk at that holding's OWN μ/σ — the
 *     SAME per-asset (return, risk) points the frontier + stock waves use (ASSET_POINTS),
 *     so a rising spark and a high-risk bar tell one consistent story;
 *   - the income character (distributes vs reinvests) is illustrative-per-instrument (the
 *     snapshot carries only a `pays_dividend` boolean, never a yield — DATA.md); we show
 *     WHICH holdings pay cash out vs reinvest it, and NEVER an invented yield figure.
 *
 * The "sector" the DESIGN §12 tables call for is DEFERRED (the snapshot carries no GICS
 * sector taxonomy — the same deferral as Wave D); we group exposure by the honest key we
 * DO hold, the asset class (investment type). The shapes mirror what Phase 5's adapter
 * will map the snake_case snapshot → these camelCase types.
 */

/* ------------------------------------------------------------------------- *
 * F1 — the sortable holdings table, each row with a tiny trend sparkline.     *
 * ------------------------------------------------------------------------- */

const SPARK_POINTS = 24; // ~fortnightly steps over the window
const SPARK_YEARS = 1; // the illustrative window the mini-trend spans

export type TrendDir = 'up' | 'down' | 'flat';

export type HoldingRow = {
  ticker: string;
  /** short human name — a proper noun, identical in EN/FR */
  name: string;
  assetClass: AssetClass;
  sleeve: Sleeve;
  role: HoldingRole;
  /** capital share, 0..1 */
  weight: number;
  /** share of total portfolio risk, 0..1 */
  riskContribution: number;
  /** the mini-series behind the sparkline (oldest → newest), ~1 illustrative year */
  spark: number[];
  /** net change over the sparkline window (last / first − 1) — the LABELLED value that
   *  pairs with the line, so the trend never rests on the sparkline (or colour) alone */
  trendPct: number;
  trendDir: TrendDir;
};

/** A stable per-ticker seed offset (so each holding's spark has its own shape). */
function tickerSeed(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) {
    h = (h * 31 + ticker.charCodeAt(i)) % 9973;
  }
  return h;
}

/**
 * A tiny illustrative price walk for one holding, drifting at its expected return and
 * wiggling at its volatility (ASSET_POINTS — the SAME μ/σ the frontier + stock waves use).
 * A log-walk (drift − ½σ² + σ·shock) with a per-ticker seed, so bonds barely move while a
 * high-vol stock is jagged, and the shape is identical on the server and the client.
 */
function buildSpark(ticker: string): {spark: number[]; trendPct: number} {
  const p = ASSET_POINTS[ticker] ?? {risk: 0.12, return: 0.05};
  const dt = SPARK_YEARS / (SPARK_POINTS - 1);
  const muStep = p.return * dt;
  const sStep = p.risk * Math.sqrt(dt);
  const seed = tickerSeed(ticker);

  const spark: number[] = [];
  let logp = 0;
  for (let i = 0; i < SPARK_POINTS; i++) {
    // Round each value to 4 dp so the array is byte-identical across engines: Math.exp /
    // Math.sin can drift by a last-ULP between Node's V8 (SSR) and the browser's V8, which
    // would otherwise tear the sparkline geometry on hydration. All downstream coordinate
    // maths is then pure arithmetic (IEEE-754 deterministic), so the SVG can't mismatch.
    spark.push(Math.round(Math.exp(logp) * 1e4) / 1e4);
    logp += muStep - 0.5 * sStep * sStep + sStep * shock(i + 1 + seed);
  }
  const trendPct = spark[0] > 0 ? spark[SPARK_POINTS - 1] / spark[0] - 1 : 0;
  return {spark, trendPct};
}

// Classify from the SAME 0.1%-rounded value the label shows (the trend % is formatted with
// maximumFractionDigits: 1), so a → can never sit beside a non-zero "+0.1%", and a ▲ never
// beside a "0%".
function trendDir(pct: number): TrendDir {
  const shown = Math.round(pct * 1000) / 1000; // 0.1% granularity, matching the label
  if (shown > 0) return 'up';
  if (shown < 0) return 'down';
  return 'flat';
}

/** Every holding as a row for the sortable table (ALLOCATION order; the table sorts). */
export function buildHoldings(): HoldingRow[] {
  return ALLOCATION.holdings.map((h) => {
    const {spark, trendPct} = buildSpark(h.ticker);
    return {
      ticker: h.ticker,
      name: h.name,
      assetClass: h.assetClass,
      sleeve: h.sleeve,
      role: h.role,
      weight: h.weight,
      riskContribution: h.riskContribution,
      spark,
      trendPct,
      trendDir: trendDir(trendPct)
    };
  });
}

/* ------------------------------------------------------------------------- *
 * F2 — "where your money sits": exposure by investment type (asset class).    *
 * The honest reframe of the spec's "sector-exposure" (no GICS sectors held).  *
 * ------------------------------------------------------------------------- */

export type ExposureRow = {
  assetClass: AssetClass;
  /** the sleeve this type belongs to — drives its colour dot (never colour-alone) */
  sleeve: Sleeve;
  /** the portfolio share in this type, 0..1 (sums to 1 across rows) */
  share: number;
  /** how many holdings make up this type */
  holdingCount: number;
  /** the tickers in this type (for the plain-table detail) */
  tickers: string[];
};

/** Exposure grouped by asset class, ranked biggest → smallest (a ranked table). */
export function buildExposure(): ExposureRow[] {
  const map = new Map<AssetClass, ExposureRow>();
  for (const h of ALLOCATION.holdings) {
    const cur =
      map.get(h.assetClass) ??
      ({
        assetClass: h.assetClass,
        sleeve: h.sleeve,
        share: 0,
        holdingCount: 0,
        tickers: []
      } as ExposureRow);
    cur.share += h.weight;
    cur.holdingCount += 1;
    cur.tickers.push(h.ticker);
    map.set(h.assetClass, cur);
  }
  return [...map.values()].sort((a, b) => b.share - a.share);
}

/* ------------------------------------------------------------------------- *
 * F3 — "which holdings pay you": income character (distributes vs reinvests). *
 * The honest reframe of the spec's "dividend-income": the snapshot holds only  *
 * a pays_dividend BOOLEAN, never a yield, so we show WHICH holdings distribute  *
 * cash vs reinvest it — and never an invented yield number.                     *
 * ------------------------------------------------------------------------- */

export type IncomeCharacter = 'distributes' | 'reinvests';

/**
 * Per-holding income character — ILLUSTRATIVE sample values, one per instrument, chosen to
 * mirror each instrument's real distribution policy: the three single stocks distribute a
 * dividend; the accumulating core funds + the gold ETC reinvest internally rather than pay
 * cash out. These are hand-authored here (the sample ALLOCATION carries no dividend field);
 * in Phase 5 this is driven by the snapshot's `pays_dividend` boolean. No yield figures —
 * we don't hold those.
 */
const INCOME_CHARACTER: Record<string, IncomeCharacter> = {
  'VWCE.DE': 'reinvests', // accumulating world-equity fund
  'AGGS.SW': 'reinvests', // accumulating global-bond fund
  'CSBGC3.SW': 'reinvests', // money-market fund
  'SGLN.L': 'reinvests', // physical-gold ETC (no income)
  NVDA: 'distributes', // pays a dividend
  'NESN.SW': 'distributes', // pays a dividend
  'ASML.AS': 'distributes' // pays a dividend
};

export type IncomeRow = {
  ticker: string;
  name: string;
  sleeve: Sleeve;
  weight: number;
  character: IncomeCharacter;
};

export type IncomeSummary = {
  /** the holdings that distribute income, biggest weight first */
  distributes: IncomeRow[];
  /** the holdings that reinvest, biggest weight first */
  reinvests: IncomeRow[];
  /** the share of the book that distributes income vs reinvests it (sum to ~1) */
  distributesShare: number;
  reinvestsShare: number;
  /** how many holdings distribute income */
  distributesCount: number;
};

/** The income split: which holdings distribute cash vs reinvest, and the portfolio split. */
export function buildIncome(): IncomeSummary {
  const rows: IncomeRow[] = ALLOCATION.holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    sleeve: h.sleeve,
    weight: h.weight,
    character: INCOME_CHARACTER[h.ticker] ?? 'reinvests'
  }));
  const byWeight = (a: IncomeRow, b: IncomeRow) => b.weight - a.weight;
  const distributes = rows.filter((r) => r.character === 'distributes').sort(byWeight);
  const reinvests = rows.filter((r) => r.character === 'reinvests').sort(byWeight);
  const sum = (rs: IncomeRow[]) => rs.reduce((acc, r) => acc + r.weight, 0);
  const distributesShare = sum(distributes);
  return {
    distributes,
    reinvests,
    distributesShare,
    reinvestsShare: sum(reinvests),
    distributesCount: distributes.length
  };
}
