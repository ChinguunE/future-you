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
const GROWTH = '[data-demo-section="growth"]'; // the 8a/8b growth + risk cards
const SECTOR = '.recharts-sector'; // a donut wedge
const BAR = '.recharts-bar-rectangle'; // a mix-vs-optimal bar
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
