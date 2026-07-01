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
    ],

    /* Contributions-vs-growth stacked-area fills (Slice 9 "Your growth"). One same-hue
       vertical sweep per band — saturated at the top of the band fading to near-clear
       at the bottom, mirroring `growthBand`'s 4-stop shape so both stacked areas read
       glossy and dimensional on our light palette without competing. `contributions`
       = --sky (money you put in), `growthStack` = --green (money it earned); each band
       is also directly labelled + legended, never colour-alone (§11). */
    contributions: [
      {offset: '0%', color: 'var(--sky)', opacity: 0.5},
      {offset: '45%', color: 'var(--sky)', opacity: 0.28},
      {offset: '80%', color: 'var(--sky)', opacity: 0.12},
      {offset: '100%', color: 'var(--sky)', opacity: 0.04}
    ],
    growthStack: [
      {offset: '0%', color: 'var(--green-500)', opacity: 0.62},
      {offset: '45%', color: 'var(--green-500)', opacity: 0.36},
      {offset: '80%', color: 'var(--green-400)', opacity: 0.15},
      {offset: '100%', color: 'var(--green-400)', opacity: 0.04}
    ],

    /* Return-distribution tail fill (Slice 9 "Your risk"). The histogram's WORST-5%
       bars get a glossy --neg sheen (same top→bottom shape as the wedge sheens) so the
       tail reads with real weight next to the calm green body bars. Never colour-alone
       — the tail is also directly labelled + the VaR/CVaR rules mark the cutoff. The
       body bars reuse `wedgeEquity` (green). */
    histTail: [
      {offset: '0%', color: 'var(--neg)', opacity: 1},
      {offset: '60%', color: 'var(--neg)', opacity: 0.92},
      {offset: '100%', color: 'var(--neg)', opacity: 0.8}
    ],

    /* Price-history area fill (Slice 9 "Your stocks"). The close-price area gets the
       same glossy 4-stop --green fade as the growth fan (a saturated top fading to
       near-clear), so a rising price reads with real body while the darker --green-700
       line still sits clearly on top. It's ONE real series — past closes — directly
       labelled + tabled, never a false single promise about the future. */
    priceArea: [
      {offset: '0%', color: 'var(--green-500)', opacity: 0.5},
      {offset: '45%', color: 'var(--green-500)', opacity: 0.28},
      {offset: '80%', color: 'var(--green-400)', opacity: 0.12},
      {offset: '100%', color: 'var(--green-400)', opacity: 0.03}
    ],

    /* Scenario rough-year bars (Slice 9 "Scenario & comparison"). Two glossy sheens for
       the loss bars that hang below the 0% waterline: --neg for a plain stock index's
       DEEPER fall, --sky for your mix's SHALLOWER, cushioned fall. Saturated at the
       waterline (top) fading as the bar sinks. Never colour-alone — each bar also carries
       a ▼ + label + number; the hue only says WHICH mix. */
    stressIndex: [
      {offset: '0%', color: 'var(--neg)', opacity: 1},
      {offset: '60%', color: 'var(--neg)', opacity: 0.92},
      {offset: '100%', color: 'var(--neg)', opacity: 0.8}
    ],
    stressYou: [
      {offset: '0%', color: 'var(--sky)', opacity: 1},
      {offset: '60%', color: 'var(--sky)', opacity: 0.92},
      {offset: '100%', color: 'var(--sky)', opacity: 0.8}
    ],

    /* Scenario benchmark gap (Slice 9 "Scenario & comparison"). A faint --green wash
       filling the space between your expected path and the 60/40 reference — the
       "you're ahead" advantage. Decorative depth only; both lines are directly labelled
       and the gap is in the table, never colour-alone. */
    benchGap: [
      {offset: '0%', color: 'var(--green-500)', opacity: 0.22},
      {offset: '100%', color: 'var(--green-400)', opacity: 0.04}
    ]
  } as const,

  /* A soft translucent "glow" underlay drawn beneath a crisp series line so it lifts
     off the fill with depth (premium gloss without an SVG filter). The crisp line is
     drawn on top at full weight; this is decorative only — the data is unchanged. */
  glow: {width: 11, opacity: 0.32},

  /* On-chart markers get glossy depth: the crisp dot keeps its white halo ring, and
     a wider, faint same-hue halo sits beneath it (a soft cast). Decorative — the
     marker's meaning stays in its label + the tooltip + the table. */
  marker: {haloRadius: 12, haloOpacity: 0.24},

  /* Goal-funding gauge (Slice 9 "Your growth") — the semicircle arc's filled "your
     odds" sweep, its pale "the rest" track, and the raised knob-dot at the tip. The
     confident brand-action green (AA) fills the odds; a faint same-hue track shows
     the remainder. Never colour-alone — the big % + the verdict word carry the
     meaning; the arc only reinforces it. Round caps match `line.cap`. Tokens only. */
  gauge: {
    arc: 'var(--green-600)', // the filled odds sweep (brand action green, AA on white)
    track: 'var(--green-500)', // the pale remainder track
    trackOpacity: 0.16,
    knob: 'var(--green-600)', // the raised tip dot (same green as the sweep)
    width: 16
  },

  /* Correlation heatmap (Slice 9 "Your risk") — a DIVERGING scale built with
     `color-mix` over these token hues, so a cell's colour is a live tint of the palette,
     never a hard-coded hex (non-negotiable #3). Green = "move together" (high positive),
     grape = "move apart" (negative), and the paper tint at the middle = "unrelated" (~0).
     Colour is never the only signal: every cell also prints its number (tabular). `maxMix`
     caps the strongest tint so a cell stays a legible tint over the cream paper — our
     greens/grapes over paper never darken enough to need a white label, so every cell
     keeps a dark-ink number that clears AA (verified in the axe pass). */
  correlation: {
    positive: 'var(--chart-1)', // green — the pair moves together
    negative: 'var(--chart-5)', // grape — the pair moves apart
    neutral: 'var(--paper)', // ~0 — unrelated
    maxMix: 88
  },

  /* Efficient-frontier scatter (Slice 9 "Your risk"). The curve of the best return for
     each level of risk, the OPTIMAL (best-paid) mix sitting on it, and a "you are here"
     marker; faint dots mark single holdings (inefficient on their own). Distinguished by
     shape + label, not colour alone (§11). Tokens only. */
  frontier: {
    curve: 'var(--green-500)', // the efficient-frontier line
    optimal: 'var(--green-700)', // the optimal (best return-per-risk) mix, on the curve
    you: 'var(--ink)', // the "you are here" point
    asset: 'var(--text-muted)' // faint single-holding context dots
  },

  /* Price-history line + latest-price dot (Slice 9 "Your stocks"). The close-price
     line is on-light --green-700 (AA) over the glossy `priceArea` fade; the crisp
     ink dot marks "today". A real past series, always paired with its axis + table. */
  price: {
    line: 'var(--green-700)',
    dot: 'var(--ink)'
  },

  /* Candlesticks (Slice 9 "Your stocks", the "advanced" toggle). A rising session
     (close ≥ open) fills the brand action green; a falling one fills --neg. Meaning
     is never colour-alone: the body sits open→close (its POSITION encodes direction),
     the thin wick shows the day's range, and the tooltip spells out O/H/L/C. Rounded
     bodies + wick caps match the soft brand, not a cold trading terminal. Tokens only. */
  candle: {
    up: 'var(--green-600)', // a rising session (close ≥ open)
    down: 'var(--neg)', // a falling session (close < open)
    radius: 2 // gently rounded bodies (brand-soft, not sharp)
  },

  /* Analyst price targets (Slice 9 "Your stocks"). A low→high consensus RAIL with the
     mean marked by a gold knob and the current price by an ink marker; the reach from
     today to the mean is tinted by direction. Upside/downside is carried by ▲/▼ + words
     + marker position, never colour alone (§11). Tokens only. */
  analyst: {
    rail: 'var(--muted)', // the pale low→high track
    reach: 'var(--green-500)', // today → consensus (the upside/downside span)
    mean: 'var(--gold)', // the consensus (mean) target knob
    current: 'var(--ink)' // where it trades today
  },

  /* Scenario & comparison (Slice 9 "Scenario & comparison") — three forward-looking cards.
     E1 rough-year bars: a plain index's DEEPER fall in --neg, your CUSHIONED fall in --sky,
     both hanging below a 0% "a normal year" waterline (--ink dashed). E2 rolling band: the
     green fan narrowing as the hold grows, a --ink break-even rule at 0%. E3 benchmark: your
     expected path in on-light --green-700 (AA), the 60/40 reference in muted ink (dashed),
     the widening gap tinted --green. Meaning never rests on colour alone — every series is
     labelled + ▲/▼ + tabled. Tokens only. */
  scenario: {
    loss: 'var(--neg)', // E1 — a plain stock index's deeper fall (the scary reference)
    cushioned: 'var(--sky)', // E1 — your mix's shallower, cushioned fall
    waterline: 'var(--ink)', // E1/E2 — the 0% "a normal year" / break-even rule
    band: 'var(--green-500)', // E2 — the rolling p10–p90 fan fill
    bandStroke: 'var(--green-400)', // E2 — the fan's thin edge
    median: 'var(--green-700)', // E2 — the expected annualised-return line (AA on light)
    you: 'var(--green-700)', // E3 — your expected path (the hero line, AA on light)
    reference: 'var(--text-muted)', // E3 — the 60/40 reference path (muted, dashed)
    gap: 'var(--green-500)' // E3 — the "you're ahead" gap fill
  },

  /* Tables — first-class (Slice 9, Wave F). F1 holdings: a row's trend sparkline is
     stroked --pos rising / --neg falling / --text-muted flat, and ALWAYS paired with a
     labelled signed % + ▲/▼ so meaning never rests on the line or colour alone (§11). F3
     income split: --gold marks the income a holding pays OUT to you (coins), --green the
     growth it reinvests INTERNALLY; each split segment is also directly labelled. F1/F2
     weight + type bars reuse the sleeve hues (sleeveColor). Tokens only (non-negotiable #3). */
  tables: {
    up: 'var(--pos)', // a rising sparkline (paired with ▲ + a signed %)
    down: 'var(--neg)', // a falling sparkline (paired with ▼ + a signed %)
    flat: 'var(--text-muted)', // little/no change (paired with → + a signed %)
    riskBar: 'var(--text)', // F1 risk magnitude bar — a neutral tone, so it reads as
    // "how much risk" and never conflates with the sleeve-coloured weight bar (category)
    distributes: 'var(--gold)', // income paid out to you
    reinvests: 'var(--green-500)' // growth reinvested internally
  }
} as const;
