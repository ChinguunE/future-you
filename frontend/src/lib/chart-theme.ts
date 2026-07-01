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

  /**
   * Allocation sleeve → colour (Slice 9 "Your mix"). One hue per sleeve, drawn from
   * the categorical set so the whole app agrees, and always paired with a direct
   * label in every chart (never colour-alone, §11). `sleeveColor` is the `var(--…)`
   * form Recharts + legend swatches take directly; `sleeveVar` is the bare token NAME
   * for nivo, which must resolve a real colour to compute its ring/label shades
   * (see useTokenColors — still token-sourced, never a hard-coded hex).
   */
  sleeveColor: {
    equity: 'var(--chart-1)', // green — the growth engine
    bond: 'var(--chart-4)', // sky — the steady ballast
    cash: 'var(--chart-3)', // gold — the dry powder
    diversifier: 'var(--chart-5)' // grape — the different-drummer sleeve
  } as Record<string, string>,
  sleeveVar: {
    equity: '--chart-1',
    bond: '--chart-4',
    cash: '--chart-3',
    diversifier: '--chart-5'
  } as Record<string, string>,

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
  animation: {duration: 640, easing: 'ease-out' as const},

  /**
   * Richer multi-stop gradient fills (DESIGN §12 richness pass — the "premium
   * dashboard" bar, re-skinned to our LIGHT palette). Each is an array of SVG stops
   * rendered into a chart's <defs> via <ChartGradient>. "Premium but restrained":
   * real presence at the top fading to near-nothing at the bottom, so a fill reads
   * glossy and dimensional without going gaudy or dark. Colours stay token-only, so
   * the fills still match the app and never drift (non-negotiable #3).
   */
  gradients: {
    /* The growth p10–p90 fan — a RICH, saturated 4-stop --green sweep (deep, glossy
       green at the top of the band fading to near-clear at the bottom), so the range
       reads with real body and depth like a premium dashboard fill, on our light
       palette. The darker --green-700 median line still reads clearly on top. */
    growthBand: [
      {offset: '0%', color: 'var(--green-500)', opacity: 0.62},
      {offset: '40%', color: 'var(--green-500)', opacity: 0.36},
      {offset: '78%', color: 'var(--green-400)', opacity: 0.15},
      {offset: '100%', color: 'var(--green-400)', opacity: 0.03}
    ],
    /* The drawdown underwater fill — a RICH 3-stop --neg sweep, deeper = more
       saturated (a real red blush at the trough, not a faint wash). Still tasteful
       reassurance on light, never a solid alarm block. Top = the water line. */
    drawdown: [
      {offset: '0%', color: 'var(--neg)', opacity: 0.14},
      {offset: '50%', color: 'var(--neg)', opacity: 0.4},
      {offset: '100%', color: 'var(--neg)', opacity: 0.62}
    ],

    /* Donut wedge sheens (Slice 9 "Your mix") — one per sleeve hue. A GENTLE same-hue
       vertical sweep (top saturated → a touch lighter at the bottom), so a solid arc
       reads glossy and top-lit without losing its colour or its meaning. The wedge is
       still a solid, directly-labelled slice — the sheen is decorative depth only. */
    wedgeEquity: [
      {offset: '0%', color: 'var(--chart-1)', opacity: 1},
      {offset: '60%', color: 'var(--chart-1)', opacity: 0.92},
      {offset: '100%', color: 'var(--chart-1)', opacity: 0.8}
    ],
    wedgeBond: [
      {offset: '0%', color: 'var(--chart-4)', opacity: 1},
      {offset: '60%', color: 'var(--chart-4)', opacity: 0.92},
      {offset: '100%', color: 'var(--chart-4)', opacity: 0.8}
    ],
    wedgeCash: [
      {offset: '0%', color: 'var(--chart-3)', opacity: 1},
      {offset: '60%', color: 'var(--chart-3)', opacity: 0.92},
      {offset: '100%', color: 'var(--chart-3)', opacity: 0.8}
    ],
    wedgeDiversifier: [
      {offset: '0%', color: 'var(--chart-5)', opacity: 1},
      {offset: '60%', color: 'var(--chart-5)', opacity: 0.92},
      {offset: '100%', color: 'var(--chart-5)', opacity: 0.8}
    ]
  } as const,

  /* A soft translucent "glow" underlay drawn beneath a crisp series line so it lifts
     off the fill with depth (premium gloss without an SVG filter). The crisp line is
     drawn on top at full weight; this is decorative only — the data is unchanged. */
  glow: {width: 11, opacity: 0.32},

  /* On-chart markers get glossy depth: the crisp dot keeps its white halo ring, and
     a wider, faint same-hue halo sits beneath it (a soft cast). Decorative — the
     marker's meaning stays in its label + the tooltip + the table. */
  marker: {haloRadius: 12, haloOpacity: 0.24}
} as const;
