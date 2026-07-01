/**
 * Locale-aware Swiss formatting (DESIGN §3, §12 — CHF/numbers per locale, tabular
 * numerals). Swiss locales (`en-CH` / `fr-CH`) group thousands with the Swiss
 * apostrophe (`CHF 43'800`) — the standard finance convention across every Swiss
 * language. We pin that separator ourselves via `formatToParts` rather than trusting
 * ICU's default, because Node and the browser ship different ICU data for fr-CH (Node
 * emits an apostrophe, Chrome a narrow no-break space) — left to ICU, an SSR-rendered
 * franc value would hydrate to a different string and tear the tree (a real hydration
 * mismatch). Formatters are comparatively expensive to construct, so we cache one per
 * locale + shape.
 *
 * Pure + deterministic across environments — the charts (client) and any server-
 * rendered figure share these, so no component re-instantiates Intl.NumberFormat,
 * drifts from the house formatting, or mismatches between server and client.
 */

const cache = new Map<string, Intl.NumberFormat>();

function get(key: string, make: () => Intl.NumberFormat): Intl.NumberFormat {
  let f = cache.get(key);
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

/**
 * Format, then force the thousands `group` separator to the Swiss apostrophe so the
 * output is identical on the server and the client (see the note above). Everything
 * else (currency symbol, spacing, decimal separator, sign) stays exactly as the
 * locale dictates.
 */
function render(nf: Intl.NumberFormat, value: number): string {
  return nf
    .formatToParts(value)
    .map((part) => (part.type === 'group' ? "'" : part.value))
    .join('');
}

/** Swiss BCP-47 tag (`en-CH` / `fr-CH`) so grouping matches the region, not just the language. */
function swiss(locale: string): string {
  return `${locale}-CH`;
}

/** Whole-franc CHF, e.g. `CHF 43'800` (en-CH) — used in tooltips, tables, worked examples. */
export function formatCHF(value: number, locale: string): string {
  return render(
    get(`chf:${locale}`, () =>
      new Intl.NumberFormat(swiss(locale), {
        style: 'currency',
        currency: 'CHF',
        maximumFractionDigits: 0
      })
    ),
    value
  );
}

/**
 * Compact CHF for axis ticks, e.g. `CHF 60K` / `CHF 60 k` — keeps a long money axis
 * legible without truncating or zooming the scale (the axis itself still starts at 0;
 * DESIGN §12 honesty rule).
 */
export function formatCHFCompact(value: number, locale: string): string {
  return render(
    get(`chfc:${locale}`, () =>
      new Intl.NumberFormat(swiss(locale), {
        style: 'currency',
        currency: 'CHF',
        notation: 'compact',
        maximumFractionDigits: 0
      })
    ),
    value
  );
}

/** Plain integer with locale grouping (e.g. a count of holdings). */
export function formatNumber(value: number, locale: string): string {
  return render(
    get(`num:${locale}`, () =>
      new Intl.NumberFormat(swiss(locale), {maximumFractionDigits: 0})
    ),
    value
  );
}

/**
 * Locale-aware percent, e.g. `-22%` (en-CH) / `-22 %` (fr-CH — ICU adds the thin
 * space). Intl multiplies by 100, so pass a fraction (`-0.22`). Whole numbers by
 * default; used by the drawdown axis + tooltip. `signDisplay` lets a caller force a
 * leading `+` for gains where the number alone wouldn't show one.
 */
export function formatPercent(
  value: number,
  locale: string,
  opts?: {maximumFractionDigits?: number; signDisplay?: 'auto' | 'always' | 'never'}
): string {
  const mfd = opts?.maximumFractionDigits ?? 0;
  const sd = opts?.signDisplay ?? 'auto';
  // A tiny magnitude that rounds to zero should read "0%", never a signed "-0%"
  // (e.g. a -0.3% dip shown at whole-percent precision).
  const shown = Math.round(value * 100 * 10 ** mfd) === 0 ? 0 : value;
  return render(
    get(`pct:${locale}:${mfd}:${sd}`, () =>
      new Intl.NumberFormat(swiss(locale), {
        style: 'percent',
        maximumFractionDigits: mfd,
        signDisplay: sd
      })
    ),
    shown
  );
}
