import {expect, test, type Locator, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 8 (analytics layer) gate — the shared chart-theme + the ChartCard wrapper,
 * proven across TWO genuinely different chart types (DESIGN §12):
 *   - 8a the honest growth fan (upside range: a median line inside a p10-p90 band);
 *   - 8b the drawdown underwater plot (downside "stomach test": a soft --neg area
 *     dipping below a 0% water line, the worst dip marked with a floating pill).
 * For each card it captures the states the static route can't show: the DEFAULT
 * chart + legend + caption, the "Show the maths" block EXPANDED (the reused
 * EquationBlock), the "View as TABLE" fallback, and a HORIZON recast — then runs
 * axe-core on each, requiring zero serious/critical WCAG-AA violations. A
 * reduced-motion pass proves both charts render at their final state immediately
 * (Recharts draw-in is gated off). Runs EN + FR across every viewport.
 */
const LOCALES = ['en', 'fr'] as const;

const CARD = '[data-slot="chart-card"]';
const SEGMENTED = '[data-slot="segmented"]';
const SEG_ITEM = '[data-slot="segmented-item"]';
const EQ_TRIGGER = '[data-slot="accordion-trigger"]';
const EQ_CONTENT = '[data-slot="accordion-content"]';
const TABLE = '[data-slot="table"]';
const LINE = '.recharts-line-curve'; // the fan's median line
const AREA = '.recharts-area-curve'; // the drawdown / contributions area stroke
const GAUGE_ARC = '[data-slot="gauge-arc"]'; // the goal-funding gauge's filled arc
const SURFACE = '.recharts-surface';

// Sections (added in Slice 9) — a stable handle now that the demo holds many cards.
const MIX = '[data-demo-section="mix"]'; // Wave A "Your mix"
const GROWTH = '[data-demo-section="growth"]'; // the 8a/8b growth + Wave B cards
const RISK = '[data-demo-section="risk"]'; // Wave C "Your risk"
const STOCK = '[data-demo-section="stock"]'; // Wave D "Your stocks"
const SCENARIO = '[data-demo-section="scenario"]'; // Wave E "Scenario & comparison"
const TABLES = '[data-demo-section="tables"]'; // Wave F "Tables, first-class"
const SECTOR = '.recharts-sector'; // a donut wedge
const BAR = '.recharts-bar-rectangle'; // a mix-vs-optimal / risk bar (a <g> wrapper)
const BAR_PATH = '.recharts-rectangle'; // the bar's inner path (carries the `d` geometry)
const REF_DOT = '.recharts-reference-dot'; // the frontier's optimal / you markers
const GRID = '[data-slot="correlation-heatmap"]'; // the correlation heatmap (DOM, not SVG)
const CANDLES = '[data-slot="candle"]'; // a hand-rolled candlestick body (Wave D)
const ANALYST = '[data-slot="analyst-target"]'; // the analyst-target range bar (DOM, Wave D)
const FUNDAMENTALS = '[data-slot="fundamentals"]'; // the fundamentals snapshot (DOM, Wave D)
const HOLDINGS_TABLE = '[data-slot="holdings-table"]'; // the sortable holdings table (Wave F)
const SPARK = '[data-slot="sparkline"]'; // a holdings-row trend sparkline (Wave F)
const EXPOSURE = '[data-slot="exposure-table"]'; // the exposure-by-type table (Wave F)
const INCOME = '[data-slot="income-split"]'; // the income-character split (DOM, Wave F)
// nivo (sunburst arcs / treemap tiles) render inside the chart region (role=group),
// scoped so the query never matches the card's mascot illustration.
const NIVO_ARC = '[role="group"] svg path';
const NIVO_TILE = '[role="group"] svg rect';

async function ready(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await settleImages(page);
}

// Recharts animates with requestAnimationFrame (react-smooth), not the Web
// Animations API, so we can't await getAnimations(); wait past the draw-in
// duration (chart-theme animation = 640ms) so the screenshot shows the settled art.
async function settleChart(page: Page) {
  await expect(page.locator(SURFACE).first()).toBeVisible();
  await page.waitForTimeout(800);
}

// Wait out an open animation on an element (the EquationBlock content) + its images.
async function settleAnimations(scope: Locator) {
  await scope.evaluate((el) =>
    Promise.all(
      el.getAnimations({subtree: true}).map((a) => a.finished.catch(() => undefined))
    )
  );
}

function shot(page: Page, project: string, name: string, fullPage = true) {
  const dir = `screenshots/${project}`;
  mkdirSync(dir, {recursive: true});
  return page.screenshot({path: `${dir}/${name}.png`, fullPage});
}

async function scan(page: Page, label: string) {
  const violations = await axeScan(page);
  logViolations(label, violations);
  expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
}

/**
 * Exercise one ChartCard's four states (default → maths → table → horizon recast),
 * screenshotting + axe-scanning each. `present` proves the chart's own geometry
 * drew; `horizonIndex` picks which timeframe to recast to for the last shot.
 */
async function exerciseCard(
  page: Page,
  card: Locator,
  present: Locator,
  project: string,
  prefix: string,
  locale: string,
  horizonIndex: number
) {
  await expect(card).toBeVisible();
  await expect(present.first()).toHaveAttribute('d', /.+/);
  await settleChart(page);
  await shot(page, project, `${prefix}_default_${locale}`);
  await scan(page, `${prefix} default ${locale} @ ${project}`);

  // ---- Show the maths: the reused EquationBlock expands ----
  const trigger = card.locator(EQ_TRIGGER);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const content = card.locator(EQ_CONTENT);
  await expect(content).toBeVisible();
  await settleAnimations(content);
  await shot(page, project, `${prefix}_maths_${locale}`);
  await scan(page, `${prefix} maths ${locale} @ ${project}`);
  await trigger.click(); // collapse again for the next shots

  // ---- View as table: the accessible fallback (view switch = 2nd segmented) ----
  const viewSwitch = card.locator(SEGMENTED).nth(1);
  await viewSwitch.locator(SEG_ITEM).nth(1).click();
  await expect(card.locator(TABLE)).toBeVisible();
  await shot(page, project, `${prefix}_table_${locale}`);
  await scan(page, `${prefix} table ${locale} @ ${project}`);

  // ---- Horizon recast: back to the chart, then choose a different timeframe ----
  await viewSwitch.locator(SEG_ITEM).nth(0).click();
  const horizonSwitch = card.locator(SEGMENTED).nth(0);
  const target = horizonSwitch.locator(SEG_ITEM).nth(horizonIndex);
  await target.click();
  await expect(target).toHaveAttribute('data-state', 'on');
  await settleChart(page);
  await shot(page, project, `${prefix}_horizon_${locale}`);
  await scan(page, `${prefix} horizon ${locale} @ ${project}`);
}

for (const locale of LOCALES) {
  test(`charts ${locale} · projection card (chart / maths / table / horizon)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const card = page.locator(GROWTH).locator(CARD).nth(0);
    // Recast the fan to the long (30y) horizon for its last shot.
    await exerciseCard(page, card, card.locator(LINE), project, 'charts', locale, 2);
  });

  test(`charts ${locale} · drawdown card (chart / maths / table / horizon)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const card = page.locator(GROWTH).locator(CARD).nth(1);
    // Recast the underwater plot to the short (5y) horizon for its last shot.
    await exerciseCard(page, card, card.locator(AREA), project, 'drawdown', locale, 0);
  });

  test(`charts ${locale} · goal-funding gauge (chart / maths / table / horizon)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    // Wave B card nth(2), appended after the fan + drawdown in the growth section.
    const card = page.locator(GROWTH).locator(CARD).nth(2);
    // Recast the gauge to the long (30y) horizon — the odds climb toward ~full.
    await exerciseCard(page, card, card.locator(GAUGE_ARC), project, 'goal', locale, 2);
  });

  test(`charts ${locale} · contributions-vs-growth (chart / maths / table / horizon)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    // Wave B card nth(3): the stacked area (contributions + growth).
    const card = page.locator(GROWTH).locator(CARD).nth(3);
    // Recast to the short (5y) horizon for its last shot (no crossover there).
    await exerciseCard(page, card, card.locator(AREA), project, 'contributions', locale, 0);
  });
}

for (const locale of LOCALES) {
  test(`charts ${locale} · reduced-motion charts are instant`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, `/${locale}/charts-demo`);

    // With reduced motion no chart draws in — all are at final geometry immediately
    // (Recharts gate isAnimationActive off; nivo gets animate={false}).
    const growth = page.locator(GROWTH);
    await expect(growth.locator(CARD).nth(0).locator(LINE).first()).toHaveAttribute(
      'd',
      /.+/
    );
    await expect(growth.locator(CARD).nth(1).locator(AREA).first()).toHaveAttribute(
      'd',
      /.+/
    );
    // Wave B: the goal gauge (SVG arc) + the contributions stacked area also settle
    // at their final geometry immediately (gauge motion gated off; Recharts too).
    await expect(
      growth.locator(CARD).nth(2).locator(GAUGE_ARC).first()
    ).toHaveAttribute('d', /.+/);
    await expect(
      growth.locator(CARD).nth(3).locator(AREA).first()
    ).toHaveAttribute('d', /.+/);
    // The mix charts (Recharts donut + nivo sunburst) are also settled at once.
    const mix = page.locator(MIX);
    await expect(mix.locator(SECTOR).first()).toBeVisible();
    await expect(mix.locator(CARD).nth(1).locator(NIVO_ARC).first()).toBeVisible();
    // Wave C: the distribution histogram bars + the frontier markers are at their
    // final geometry immediately (Recharts draw-in gated off); the DOM heatmap has no
    // animation to gate.
    const risk = page.locator(RISK);
    await expect(risk.locator(CARD).nth(0).locator(BAR_PATH).first()).toHaveAttribute(
      'd',
      /.+/
    );
    await expect(risk.locator(CARD).nth(3).locator(REF_DOT).first()).toBeVisible();
    // Wave D: the price line settles at once (Recharts draw-in gated off); the analyst
    // + fundamentals charts are hand-built DOM with no animation to gate, so both are
    // present immediately.
    const stock = page.locator(STOCK);
    await expect(
      stock.locator(CARD).nth(0).locator(LINE).first()
    ).toHaveAttribute('d', /.+/);
    await expect(stock.locator(CARD).nth(1).locator(ANALYST)).toBeVisible();
    await expect(stock.locator(CARD).nth(2).locator(FUNDAMENTALS)).toBeVisible();
    // Wave E: the benchmark lines (nth0), the stress bars (nth1) and the rolling band
    // (nth2) all settle at their final geometry immediately (Recharts draw-in gated off).
    const scenario = page.locator(SCENARIO);
    await expect(
      scenario.locator(CARD).nth(0).locator(LINE).first()
    ).toHaveAttribute('d', /.+/);
    await expect(
      scenario.locator(CARD).nth(1).locator(BAR_PATH).first()
    ).toHaveAttribute('d', /.+/);
    await expect(
      scenario.locator(CARD).nth(2).locator(AREA).first()
    ).toHaveAttribute('d', /.+/);
    // Wave F: the tables are static DOM — the holdings sparkline is a plain SVG path (no
    // draw-in to gate), and the exposure + income tables have no animation, so all three
    // are present at once.
    const tables = page.locator(TABLES);
    await expect(
      tables.locator(CARD).nth(0).locator(`${SPARK} path`).first()
    ).toHaveAttribute('d', /.+/);
    await expect(tables.locator(CARD).nth(1).locator(EXPOSURE)).toBeVisible();
    await expect(tables.locator(CARD).nth(2).locator(INCOME)).toBeVisible();
    await settleChart(page);
    await shot(page, project, `charts_reduced_${locale}`);
    await scan(page, `charts reduced ${locale} @ ${project}`);
  });
}

/**
 * Slice 9 · Wave A ("Your mix") gate — the four allocation charts: a Recharts donut, a
 * nivo sunburst, a nivo treemap (with a by-money / by-risk metric toggle), and a
 * Recharts "your mix vs optimal" grouped bar. Screenshots the section default, then
 * each card's key states (table fallback everywhere; the treemap's risk recast; the
 * optimal card's "show the maths") and axe-scans each — zero serious/critical WCAG-AA
 * violations. The view switch is the LAST segmented in a card (the donut/sunburst/
 * optimal have only it; the treemap also has the metric toggle in front). EN + FR ×
 * every viewport.
 */
for (const locale of LOCALES) {
  test(`charts ${locale} · mix section (donut / sunburst / treemap / optimal)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const mix = page.locator(MIX);
    await expect(mix).toBeVisible();
    const cards = mix.locator(CARD);

    // ---- Default: all four Your-mix cards drawn (Recharts wedges + nivo arcs/tiles) ----
    await expect(cards.nth(0).locator(SECTOR).first()).toHaveAttribute('d', /.+/);
    await expect(cards.nth(1).locator(NIVO_ARC).first()).toBeVisible();
    await expect(cards.nth(2).locator(NIVO_TILE).first()).toBeVisible();
    await expect(cards.nth(3).locator(BAR).first()).toBeVisible();
    await settleChart(page);
    await shot(page, project, `mix_default_${locale}`);
    await scan(page, `mix default ${locale} @ ${project}`);

    // helper: flip a card to its table view (last segmented, 2nd item), shot + scan,
    // then flip back to the chart so later full-page shots stay clean.
    async function tableShot(cardIndex: number, name: string) {
      const card = cards.nth(cardIndex);
      const view = card.locator(SEGMENTED).last();
      await view.locator(SEG_ITEM).nth(1).click();
      await expect(card.locator(TABLE)).toBeVisible();
      await shot(page, project, `mix_${name}_table_${locale}`);
      await scan(page, `mix ${name} table ${locale} @ ${project}`);
      await view.locator(SEG_ITEM).nth(0).click();
    }

    // ---- A1 donut ----
    await tableShot(0, 'donut');

    // ---- A2 sunburst ----
    await tableShot(1, 'sunburst');

    // ---- A3 treemap: recast money → risk, then the table ----
    const tree = cards.nth(2);
    const metric = tree.locator(SEGMENTED).first();
    await metric.locator(SEG_ITEM).nth(1).click();
    await expect(metric.locator(SEG_ITEM).nth(1)).toHaveAttribute('data-state', 'on');
    await settleChart(page);
    await shot(page, project, `mix_treemap_risk_${locale}`);
    await scan(page, `mix treemap risk ${locale} @ ${project}`);
    await tableShot(2, 'treemap');
    await metric.locator(SEG_ITEM).nth(0).click(); // back to by-money

    // ---- A4 optimal: show the maths, then the table ----
    const opt = cards.nth(3);
    const trigger = opt.locator(EQ_TRIGGER);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const content = opt.locator(EQ_CONTENT);
    await expect(content).toBeVisible();
    await settleAnimations(content);
    await shot(page, project, `mix_optimal_maths_${locale}`);
    await scan(page, `mix optimal maths ${locale} @ ${project}`);
    await trigger.click();
    await tableShot(3, 'optimal');
  });
}

/**
 * Slice 9 · Wave C ("Your risk") gate — the four risk charts: a Recharts
 * return-distribution histogram with a shaded VaR/CVaR tail (its own horizon toggle +
 * "show the maths"), a hand-built correlation heatmap (a DOM grid, not an SVG), a
 * grouped risk-vs-weight bar, and a Recharts efficient-frontier scatter with a
 * you-are-here marker. Screenshots the section default, the distribution card's full
 * cycle, and each other card's table fallback, axe-scanning each (zero serious/critical
 * WCAG-AA — this also gates the heatmap cell contrast). EN + FR × every viewport.
 */
for (const locale of LOCALES) {
  test(`charts ${locale} · risk section (distribution / correlation / contribution / frontier)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const risk = page.locator(RISK);
    await expect(risk).toBeVisible();
    const cards = risk.locator(CARD);

    // ---- Default: all four risk cards drawn (histogram bars, the DOM heatmap grid,
    //      the risk bars, and the frontier's you/optimal markers) ----
    await expect(cards.nth(0).locator(BAR_PATH).first()).toHaveAttribute('d', /.+/);
    await expect(cards.nth(1).locator(GRID)).toBeVisible();
    await expect(cards.nth(2).locator(BAR).first()).toBeVisible();
    await expect(cards.nth(3).locator(REF_DOT).first()).toBeVisible();
    await settleChart(page);
    await shot(page, project, `risk_default_${locale}`);
    await scan(page, `risk default ${locale} @ ${project}`);

    // ---- C1 distribution: full cycle (default → maths → table → recast to long) ----
    await exerciseCard(
      page,
      cards.nth(0),
      cards.nth(0).locator(BAR_PATH),
      project,
      'risk_distribution',
      locale,
      2
    );

    // helper: flip a card to its table view (the only/last segmented), shot + scan,
    // then flip back to the chart so later full-page shots stay clean.
    async function tableShot(cardIndex: number, name: string) {
      const card = cards.nth(cardIndex);
      const view = card.locator(SEGMENTED).last();
      await view.locator(SEG_ITEM).nth(1).click();
      await expect(card.locator(TABLE)).toBeVisible();
      await shot(page, project, `risk_${name}_table_${locale}`);
      await scan(page, `risk ${name} table ${locale} @ ${project}`);
      await view.locator(SEG_ITEM).nth(0).click();
    }

    // ---- C2 correlation heatmap (table fallback) ----
    await tableShot(1, 'correlation');
    // ---- C3 risk-contribution bars (table fallback) ----
    await tableShot(2, 'contribution');
    // ---- C4 efficient frontier (table fallback) ----
    await tableShot(3, 'frontier');
  });
}

/**
 * Slice 9 · Wave D ("Your stocks") gate — the three per-stock charts anchored on NVIDIA:
 * a price-history line/area with a candlestick "advanced" toggle + a 1M–Max range, an
 * analyst-target low/mean/high range bar (hand-built DOM), and a fundamentals snapshot
 * (a beta-vs-market bar + quality flags, hand-built DOM). Screenshots the section
 * default, the price card's candles view + table + range recast, and the other two
 * cards' table fallbacks, axe-scanning each (zero serious/critical WCAG-AA). The price
 * card's segmenteds are [range (nth0), view (nth1), line/candles (nth2)]; the analyst +
 * fundamentals cards carry only the view switch. EN + FR × every viewport.
 */
for (const locale of LOCALES) {
  test(`charts ${locale} · stock section (price / analyst / fundamentals)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const stock = page.locator(STOCK);
    await expect(stock).toBeVisible();
    const cards = stock.locator(CARD);

    // ---- Default: the price line drew; the analyst rail + fundamentals panel are up ----
    await expect(cards.nth(0).locator(LINE).first()).toHaveAttribute('d', /.+/);
    await expect(cards.nth(1).locator(ANALYST)).toBeVisible();
    await expect(cards.nth(2).locator(FUNDAMENTALS)).toBeVisible();
    await settleChart(page);
    await shot(page, project, `stock_default_${locale}`);
    await scan(page, `stock default ${locale} @ ${project}`);

    // ---- D1 price: the candlestick "advanced" view (mode toggle = 3rd segmented) ----
    const price = cards.nth(0);
    const modeSwitch = price.locator(SEGMENTED).nth(2);
    await modeSwitch.locator(SEG_ITEM).nth(1).click(); // → candles
    await expect(price.locator(CANDLES).first()).toBeVisible();
    await settleChart(page);
    await shot(page, project, `stock_price_candles_${locale}`);
    await scan(page, `stock price candles ${locale} @ ${project}`);
    await modeSwitch.locator(SEG_ITEM).nth(0).click(); // back to line

    // ---- D1 price: table fallback (view switch = 2nd segmented) ----
    const priceView = price.locator(SEGMENTED).nth(1);
    await priceView.locator(SEG_ITEM).nth(1).click();
    await expect(price.locator(TABLE)).toBeVisible();
    await shot(page, project, `stock_price_table_${locale}`);
    await scan(page, `stock price table ${locale} @ ${project}`);
    await priceView.locator(SEG_ITEM).nth(0).click();

    // ---- D1 price: recast the range to Max (range = 1st segmented, last item) ----
    const range = price.locator(SEGMENTED).nth(0);
    const maxItem = range.locator(SEG_ITEM).nth(3);
    await maxItem.click();
    await expect(maxItem).toHaveAttribute('data-state', 'on');
    await settleChart(page);
    await shot(page, project, `stock_price_max_${locale}`);
    await scan(page, `stock price max ${locale} @ ${project}`);

    // helper: flip a card's only view switch to the table, shot + scan, flip back.
    async function tableShot(cardIndex: number, name: string) {
      const card = cards.nth(cardIndex);
      const view = card.locator(SEGMENTED).last();
      await view.locator(SEG_ITEM).nth(1).click();
      await expect(card.locator(TABLE)).toBeVisible();
      await shot(page, project, `stock_${name}_table_${locale}`);
      await scan(page, `stock ${name} table ${locale} @ ${project}`);
      await view.locator(SEG_ITEM).nth(0).click();
    }

    // ---- D2 analyst targets (table fallback) ----
    await tableShot(1, 'analyst');
    // ---- D3 fundamentals snapshot (table fallback) ----
    await tableShot(2, 'fundamentals');
  });
}

/**
 * Slice 9 · Wave E ("Scenario & comparison") gate — three FORWARD-looking cards (no crisis
 * replay): a benchmark comparison (your mix's expected path vs a plain 60/40, full-width,
 * with a horizon toggle + "show the maths"), rough-year stress bars (your mix vs a plain
 * index, sinking below a 0% waterline), and a rolling-returns band that narrows with the
 * hold. Screenshots the section default, the benchmark card's full cycle, and the stress +
 * rolling cards' maths + table states, axe-scanning each (zero serious/critical WCAG-AA).
 * The benchmark card's segmenteds are [horizon (nth0), view (nth1)]; the stress + rolling
 * cards carry only the view switch. EN + FR × every viewport.
 */
for (const locale of LOCALES) {
  test(`charts ${locale} · scenario section (benchmark / stress / rolling)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const scenario = page.locator(SCENARIO);
    await expect(scenario).toBeVisible();
    const cards = scenario.locator(CARD);

    // ---- Default: benchmark lines drew, stress bars drew, rolling band drew ----
    await expect(cards.nth(0).locator(LINE).first()).toHaveAttribute('d', /.+/);
    await expect(cards.nth(1).locator(BAR_PATH).first()).toHaveAttribute('d', /.+/);
    await expect(cards.nth(2).locator(AREA).first()).toHaveAttribute('d', /.+/);
    await settleChart(page);
    await shot(page, project, `scenario_default_${locale}`);
    await scan(page, `scenario default ${locale} @ ${project}`);

    // ---- E3 benchmark: full cycle (default → maths → table → recast to short) ----
    await exerciseCard(
      page,
      cards.nth(0),
      cards.nth(0).locator(LINE),
      project,
      'scenario_benchmark',
      locale,
      0
    );

    // helper: expand a card's "show the maths", shot + scan, collapse again.
    async function mathsShot(cardIndex: number, name: string) {
      const card = cards.nth(cardIndex);
      const trigger = card.locator(EQ_TRIGGER);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const content = card.locator(EQ_CONTENT);
      await expect(content).toBeVisible();
      await settleAnimations(content);
      await shot(page, project, `scenario_${name}_maths_${locale}`);
      await scan(page, `scenario ${name} maths ${locale} @ ${project}`);
      await trigger.click();
    }
    // helper: flip a card's only view switch to the table, shot + scan, flip back.
    async function tableShot(cardIndex: number, name: string) {
      const card = cards.nth(cardIndex);
      const view = card.locator(SEGMENTED).last();
      await view.locator(SEG_ITEM).nth(1).click();
      await expect(card.locator(TABLE)).toBeVisible();
      await shot(page, project, `scenario_${name}_table_${locale}`);
      await scan(page, `scenario ${name} table ${locale} @ ${project}`);
      await view.locator(SEG_ITEM).nth(0).click();
    }

    // ---- E1 rough-year stress bars: show the maths, then the table ----
    await mathsShot(1, 'stress');
    await tableShot(1, 'stress');
    // ---- E2 rolling returns: show the maths, then the table ----
    await mathsShot(2, 'rolling');
    await tableShot(2, 'rolling');
  });
}

/**
 * Slice 9 · Wave F ("Tables, first-class") gate — the three table cards: a SORTABLE
 * holdings table (each row with a trend sparkline + a proportional weight bar), a ranked
 * exposure-by-type table with in-row bars, and an income-character split (which holdings
 * pay cash out vs reinvest). A table is a first-class chart type here, so each card's rich
 * "Visual" view is the artifact and the ChartCard's "Plain" table is the fallback (no
 * horizon, no maths — only the view switch). Screenshots the section default, the holdings
 * sort interaction (click a header → aria-sort flips + the rows re-rank), and each card's
 * plain-table fallback, axe-scanning each (zero serious/critical WCAG-AA — this also gates
 * the sortable-header + split-bar a11y). EN + FR × every viewport.
 */
for (const locale of LOCALES) {
  test(`charts ${locale} · tables section (holdings / exposure / income)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);
    const tables = page.locator(TABLES);
    await expect(tables).toBeVisible();
    const cards = tables.locator(CARD);

    // ---- Default: the holdings sparkline drew (a real SVG path), and the exposure +
    //      income artifacts are up ----
    await expect(
      cards.nth(0).locator(`${SPARK} path`).first()
    ).toHaveAttribute('d', /.+/);
    await expect(cards.nth(1).locator(EXPOSURE)).toBeVisible();
    await expect(cards.nth(2).locator(INCOME)).toBeVisible();
    await shot(page, project, `tables_default_${locale}`);
    await scan(page, `tables default ${locale} @ ${project}`);

    // ---- F1 holdings: sort by Risk (the 4th header cell) — aria-sort flips to descending
    //      and the table re-ranks (the interactive, accessible sort) ----
    const holdings = cards.nth(0);
    const riskHead = holdings.locator(`${HOLDINGS_TABLE} thead th`).nth(3);
    await riskHead.locator('button').click();
    await expect(riskHead).toHaveAttribute('aria-sort', 'descending');
    await shot(page, project, `tables_holdings_sorted_${locale}`);
    await scan(page, `tables holdings sorted ${locale} @ ${project}`);

    // helper: flip a card's only view switch to the plain table, shot + scan, flip back
    // (remounts the visual artifact, so its sort state resets — fine, it ran above).
    async function tableShot(cardIndex: number, name: string) {
      const card = cards.nth(cardIndex);
      const view = card.locator(SEGMENTED).last();
      await view.locator(SEG_ITEM).nth(1).click();
      await expect(card.locator(TABLE)).toBeVisible();
      await shot(page, project, `tables_${name}_table_${locale}`);
      await scan(page, `tables ${name} table ${locale} @ ${project}`);
      await view.locator(SEG_ITEM).nth(0).click();
    }

    // ---- F1 holdings (plain-table fallback) ----
    await tableShot(0, 'holdings');
    // ---- F2 exposure-by-type (plain-table fallback) ----
    await tableShot(1, 'exposure');
    // ---- F3 income split (plain-table fallback) ----
    await tableShot(2, 'income');
  });
}
