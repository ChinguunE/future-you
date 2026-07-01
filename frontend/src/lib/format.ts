/**
 * Locale-aware Swiss formatting (DESIGN §3, §12 — CHF/numbers per locale, tabular
 * numerals). Swiss locales (`en-CH` / `fr-CH`) group thousands with an apostrophe
 * and French adds a thin space where its locale data calls for one; we delegate all
 * grouping/separators to ICU rather than hand-inserting them. Formatters are
 * comparatively expensive to construct, so we cache one per locale + shape.
 *
 * Pure functions, safe on the server render and the client — the charts (client)
 * and any server table share these so no component re-instantiates Intl.NumberFormat
 * or drifts from the house formatting.
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

/** Swiss BCP-47 tag (`en-CH` / `fr-CH`) so grouping matches the region, not just the language. */
function swiss(locale: string): string {
  return `${locale}-CH`;
}

/** Whole-franc CHF, e.g. `CHF 43'800` (en-CH) — used in tooltips, tables, worked examples. */
export function formatCHF(value: number, locale: string): string {
  return get(`chf:${locale}`, () =>
    new Intl.NumberFormat(swiss(locale), {
      style: 'currency',
      currency: 'CHF',
      maximumFractionDigits: 0
    })
  ).format(value);
}

/**
 * Compact CHF for axis ticks, e.g. `CHF 60K` / `CHF 60 k` — keeps a long money axis
 * legible without truncating or zooming the scale (the axis itself still starts at 0;
 * DESIGN §12 honesty rule).
 */
export function formatCHFCompact(value: number, locale: string): string {
  return get(`chfc:${locale}`, () =>
    new Intl.NumberFormat(swiss(locale), {
      style: 'currency',
      currency: 'CHF',
      notation: 'compact',
      maximumFractionDigits: 0
    })
  ).format(value);
}

/** Plain integer with locale grouping (e.g. a count of holdings). */
export function formatNumber(value: number, locale: string): string {
  return get(`num:${locale}`, () =>
    new Intl.NumberFormat(swiss(locale), {maximumFractionDigits: 0})
  ).format(value);
}
