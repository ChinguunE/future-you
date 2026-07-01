/**
 * chart-theme — the SINGLE source of truth that maps our design tokens (DESIGN
 * §2–§4) onto Recharts styling, so no chart ever hard-codes a colour, font or
 * radius (CLAUDE.md non-negotiable #3; DESIGN §12 "consistency is enforced, not
 * hoped for"). Recharts takes colour/size props as plain strings, so every value
 * here is a `var(--token)` reference read at runtime — a chart that hardcodes
 * styling (or whose colours drift from these) is a defect.
 *
 * Duolingo has no data-viz, so this chart language is ours: calm, friendly-rounded
 * and HONEST — never the grey Excel default, never cute at the cost of accuracy.
 */

export const chartTheme = {
  /**
   * Categorical series palette (green -> coral -> gold -> sky -> grape), from the
   * `--chart-1..5` tokens. Distinguished by more than hue: every chart also labels
   * or marks its series directly, so meaning never rests on colour alone (DESIGN
   * §11) — which is also what keeps the set colour-blind-safe.
   */
  series: [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)'
  ],

  /* Growth-projection roles — distinguished by luminance AND shape (a solid line,
     a translucent band, a dashed rule, a dot), not colour alone. */
  median: 'var(--green-700)', // the central "most likely" line (on-light green, AA)
  band: 'var(--green-500)', // the p10-p90 fan fill (decorative chart green)
  bandOpacity: 0.16,
  bandStroke: 'var(--green-400)',
  contributions: 'var(--sky)', // money you put in
  growth: 'var(--green-500)', // money it earned
  goal: 'var(--gold)', // the "your goal" reference rule
  here: 'var(--ink)', // the "you are here" dot

  /* Gains / losses — ALWAYS paired with an arrow + label, never colour-alone (§11). */
  pos: 'var(--pos)',
  neg: 'var(--neg)',

  /* On-chart annotation label text — legible ink, since gold/sky/etc. fail text AA. */
  annotation: 'var(--ink)',

  /* Line + bar geometry — rounded caps/joins and rounded bars match the soft brand. */
  line: {width: 3, cap: 'round' as const, join: 'round' as const},
  bar: {radius: 6},

  /* Axes — Nunito, tabular numerals applied via `.nums` on tick text; muted ink. */
  axis: {
    stroke: 'var(--border)',
    tick: 'var(--text-muted)',
    fontFamily: 'var(--font-nunito)',
    fontSize: 13,
    fontWeight: 600
  },

  /* Gridlines — soft dotted horizontal only (never the heavy Excel grid). */
  grid: {stroke: 'var(--border)', dash: '2 6'},

  /* The dashed hover cursor line that follows the pointer. */
  cursor: {stroke: 'var(--border)', dash: '3 4'},

  /**
   * A quick draw-in on entry. The chart GATES this with useReducedMotion ->
   * `isAnimationActive={false}` + duration 0, because Recharts animates in JS and
   * the global `prefers-reduced-motion` CSS media query does not reach it.
   */
  animation: {duration: 640, easing: 'ease-out' as const}
} as const;
