import {ALLOCATION} from './allocation-data';
import {hash, shock} from './noise';

/**
 * SAMPLE per-stock data for the dev-only charts demo (Slice 9, Wave D — "Your stocks").
 * Deterministic, NO live data and NO randomness — the real numbers arrive from the
 * snapshot layer in Phase 5 (a planned `snapshots/prices` for the tape, yfinance
 * analyst targets, and the StockFacts we already carry). Everything here is anchored on
 * the SAME NVIDIA the mix/risk waves already use (ALLOCATION.holdings), and the risk
 * figures are the SAME ones risk-data.ts uses, so the stock charts can never disagree
 * with the rest of the catalogue:
 *   - the price tape drifts at NVDA's expected return μ and wiggles at its volatility σ;
 *   - beta is derived from the SAME correlation-to-market and vols (β = ρ·σ_stock/σ_mkt);
 *   - the fundamentals are the real StockFacts fields (market cap, beta, listed-since,
 *     profitable / pays-dividend / index-member) — the ones the snapshot actually holds.
 *
 * The shapes mirror the snapshot/API contract Phase 5 will serve (a prices series, an
 * analyst-target block, and the StockFacts snapshot); Phase 5's adapter maps the real
 * snake_case snapshot → these camelCase types.
 */

/* The anchor stock — its identity comes straight from the shared sample universe, so
 * the ticker + name always match the mix/risk waves (the emblematic "NVIDIA flow"). */
const ANCHOR = ALLOCATION.holdings.find((h) => h.ticker === 'NVDA');

export const STOCK = {
  ticker: ANCHOR?.ticker ?? 'NVDA',
  name: ANCHOR?.name ?? 'NVIDIA',
  /** a US stock trades in its home currency (USD); Phase 5 reads this from the quote */
  currency: 'USD'
} as const;

/* --- Scenario constants (illustrative, deterministic; provenance in the comments) --- */

const AS_OF_YEAR = 2026; // the demo "today" (matches START_YEAR across the other waves)
const CURRENT_PRICE = 172.4; // an illustrative latest close (USD)

// NVDA's expected return + volatility — the SAME figures as risk-data.ts ASSET_POINTS['NVDA'].
const MU_ANNUAL = 0.1; // drift of the tape
const SIGMA_ANNUAL = 0.34; // wiggle of the tape

// Market-relative risk (β) from the SAME inputs as the correlation heatmap:
// ρ(VWCE.DE, NVDA) = 0.78 and the vols σ_NVDA = 0.34, σ_market = 0.15 (VWCE.DE).
// β = ρ · σ_stock / σ_market ≈ 1.77 — "moves about 1.8× the market".
const RHO_MARKET = 0.78;
const SIGMA_MARKET = 0.15;
const BETA = (RHO_MARKET * SIGMA_ANNUAL) / SIGMA_MARKET;

const FIRST_TRADE_YEAR = 1999; // NVDA's real listing year (StockFacts.first_trade_date)
const MARKET_CAP = 2.86e12; // an illustrative market cap (USD)
const INDEX_NAME = 'S&P 500'; // StockFacts.index_name

const TRADING_DAYS = 252;
const HISTORY_YEARS = 6; // depth of the "Max" range
const N_DAYS = Math.round(HISTORY_YEARS * TRADING_DAYS);

/* The deterministic "tape" noise (hash / shock) now lives in ./noise, shared with the
 * Wave-F sparklines — same behaviour, one definition. */

export type Ohlc = {
  /** fractional calendar year (the x value): AS_OF_YEAR − days-ago / 252 */
  t: number;
  /** the session date as a UTC millisecond stamp (for the tooltip's date label) */
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

/**
 * The full daily OHLC history (oldest → newest), built once. A geometric walk at NVDA's
 * μ/σ, then rescaled so the LAST close is exactly CURRENT_PRICE (rescaling preserves the
 * shape). Each session's open/high/low are derived deterministically from the close path
 * so the candles read like a real tape.
 */
function buildFullHistory(): Ohlc[] {
  const muD = MU_ANNUAL / TRADING_DAYS;
  const sD = SIGMA_ANNUAL / Math.sqrt(TRADING_DAYS);

  // Closes via a log-random walk (drift − ½σ² + σ·shock), then rescaled to end at today.
  const rawClose: number[] = [];
  let logp = 0;
  for (let i = 0; i < N_DAYS; i++) {
    logp += muD - 0.5 * sD * sD + sD * shock(i + 1);
    rawClose.push(Math.exp(logp));
  }
  const scale = CURRENT_PRICE / rawClose[N_DAYS - 1];
  const close = rawClose.map((v) => v * scale);

  // Trading-day dates: step back from the as-of date, skipping weekends, then reverse.
  const anchorMs = Date.UTC(AS_OF_YEAR, 0, 2); // ~2 Jan of the as-of year
  const dates: number[] = [];
  let cursor = anchorMs;
  while (dates.length < N_DAYS) {
    const day = new Date(cursor).getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor);
    cursor -= 86_400_000;
  }
  dates.reverse();

  const out: Ohlc[] = [];
  for (let i = 0; i < N_DAYS; i++) {
    const c = close[i];
    // Open near the prior close (a small overnight gap); high/low straddle the body.
    const prev = i === 0 ? c * (1 - 0.4 * sD) : close[i - 1];
    const open = prev * (1 + 0.4 * sD * hash(i * 3 + 2));
    const spread = c * (0.35 * sD + 0.5 * sD * Math.abs(hash(i * 7 + 4)));
    const hi = Math.max(open, c) + spread;
    const lo = Math.min(open, c) - spread;
    out.push({
      t: AS_OF_YEAR - (N_DAYS - 1 - i) / TRADING_DAYS,
      date: dates[i],
      open: round2(open),
      high: round2(hi),
      low: round2(Math.max(0.01, lo)),
      close: round2(c)
    });
  }
  return out;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

const FULL_HISTORY = buildFullHistory();

export type StockRange = '1M' | '6M' | '1Y' | 'max';

// Four well-spread ranges (1 month → since-listing). Kept to four so the selector fits
// the ChartCard control slot even on a 390px phone (five default pills overflow it).
export const STOCK_RANGES: readonly StockRange[] = ['1M', '6M', '1Y', 'max'];

const RANGE_YEARS: Record<StockRange, number> = {
  '1M': 1 / 12,
  '6M': 0.5,
  '1Y': 1,
  max: HISTORY_YEARS
};

export type PriceSeries = {
  /** the daily closes in the window (for the line/area view) */
  points: Ohlc[];
  /** the same window bucketed into legible candles (for the "advanced" view) */
  candles: Ohlc[];
  first: Ohlc;
  last: Ohlc;
  /** change over the window, in price and as a fraction */
  changeAbs: number;
  changePct: number;
  /** the window's lowest low and highest high (for the KPI range) */
  low: number;
  high: number;
};

/**
 * Bucket a run of daily sessions into at most `maxCandles` candles so a long range
 * stays legible (1 month ≈ daily; 5 years ≈ monthly). Each bucket opens on its first
 * session and closes on its last, with the true high/low across the span.
 */
function bucket(points: Ohlc[], maxCandles: number): Ohlc[] {
  const size = Math.max(1, Math.ceil(points.length / maxCandles));
  if (size === 1) return points;
  const out: Ohlc[] = [];
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    const last = slice[slice.length - 1];
    out.push({
      t: last.t,
      date: last.date,
      open: slice[0].open,
      high: Math.max(...slice.map((p) => p.high)),
      low: Math.min(...slice.map((p) => p.low)),
      close: last.close
    });
  }
  return out;
}

/** The price history for a range (1M … Max): the daily line + bucketed candles + KPIs. */
export function buildPriceSeries(range: StockRange): PriceSeries {
  const lastT = FULL_HISTORY[FULL_HISTORY.length - 1].t;
  const from = lastT - RANGE_YEARS[range] + 1e-9;
  const points =
    range === 'max' ? FULL_HISTORY : FULL_HISTORY.filter((p) => p.t >= from);

  const first = points[0];
  const last = points[points.length - 1];
  const changeAbs = round2(last.close - first.close);
  const changePct = first.close > 0 ? last.close / first.close - 1 : 0;

  return {
    points,
    candles: bucket(points, 54),
    first,
    last,
    changeAbs,
    changePct,
    low: Math.min(...points.map((p) => p.low)),
    high: Math.max(...points.map((p) => p.high))
  };
}

/* ------------------------------------------------------------------------- *
 * Analyst price targets — the low / mean (consensus) / high a panel of       *
 * analysts sees, plus where it trades today and the implied upside. Mirrors   *
 * yfinance's targetLowPrice / targetMeanPrice / targetHighPrice + count.      *
 * ------------------------------------------------------------------------- */

export type AnalystTargets = {
  /** where it trades today (USD) */
  current: number;
  low: number;
  mean: number;
  high: number;
  /** number of analysts contributing */
  count: number;
  /** (mean − current) / current — the implied move to the consensus target */
  upside: number;
};

export function buildAnalystTargets(): AnalystTargets {
  const current = CURRENT_PRICE;
  const low = 140;
  const mean = 205;
  const high = 268;
  return {
    current,
    low,
    mean,
    high,
    count: 52,
    upside: mean / current - 1
  };
}

/* ------------------------------------------------------------------------- *
 * Fundamentals snapshot — the REAL StockFacts fields the snapshot carries     *
 * today (market cap, beta, listed-since, and the quality flags). Nothing here  *
 * is invented beyond the sample values: every field maps to a snapshot key.    *
 * ------------------------------------------------------------------------- */

export type Fundamentals = {
  currentPrice: number;
  marketCap: number;
  /** market-relative volatility; the market itself is 1.0 */
  beta: number;
  betaMarket: number;
  firstTradeYear: number;
  asOfYear: number;
  yearsListed: number;
  isProfitable: boolean;
  paysDividend: boolean;
  isIndexMember: boolean;
  indexName: string;
};

export function buildFundamentals(): Fundamentals {
  return {
    currentPrice: CURRENT_PRICE,
    marketCap: MARKET_CAP,
    beta: Math.round(BETA * 100) / 100,
    betaMarket: 1,
    firstTradeYear: FIRST_TRADE_YEAR,
    asOfYear: AS_OF_YEAR,
    yearsListed: AS_OF_YEAR - FIRST_TRADE_YEAR,
    isProfitable: true,
    paysDividend: true,
    isIndexMember: true,
    indexName: INDEX_NAME
  };
}
