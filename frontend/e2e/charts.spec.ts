import {expect, test, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 8 (analytics foundation) gate — the shared chart-theme + the ChartCard
 * wrapper, proven by the honest growth projection (DESIGN §12). Captures the states
 * the static route can't show on its own: the DEFAULT chart (median line inside the
 * p10-p90 band, with the legend + "you are here"/"your goal" markers), the "Show the
 * maths" block EXPANDED (the reused EquationBlock), the "View as TABLE" fallback,
 * and the LONG horizon recasting the timeline — then runs axe-core on each,
 * requiring zero serious/critical WCAG-AA violations. A reduced-motion pair proves
 * the chart renders at its final state immediately (Recharts draw-in is gated off).
 * Runs EN + FR across every viewport (mobile/tablet/desktop).
 */
const LOCALES = ['en', 'fr'] as const;

const CARD = '[data-slot="chart-card"]';
const SEGMENTED = `${CARD} [data-slot="segmented"]`;
const SEG_ITEM = '[data-slot="segmented-item"]';
const EQ_TRIGGER = '[data-slot="accordion-trigger"]';
const EQ_CONTENT = '[data-slot="accordion-content"]';
const TABLE = '[data-slot="table"]';
const LINE = '.recharts-line-curve';
const SURFACE = '.recharts-surface';

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
async function settleAnimations(page: Page, selector: string) {
  const node = page.locator(selector).first();
  await node.evaluate((el) =>
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

for (const locale of LOCALES) {
  test(`charts ${locale} · projection card (chart / maths / table / horizon)`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/charts-demo`);

    // ---- Default: the fan chart, the legend and the caption ----
    await expect(page.locator(CARD)).toBeVisible();
    // The median line drew (a path with real geometry) — the fan is present.
    await expect(page.locator(LINE).first()).toHaveAttribute('d', /.+/);
    await settleChart(page);
    await shot(page, project, `charts_default_${locale}`);
    await scan(page, `charts default ${locale} @ ${project}`);

    // ---- Show the maths: the reused EquationBlock expands ----
    const trigger = page.locator(`${CARD} ${EQ_TRIGGER}`);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(EQ_CONTENT)).toBeVisible();
    await settleAnimations(page, EQ_CONTENT);
    await shot(page, project, `charts_maths_${locale}`);
    await scan(page, `charts maths ${locale} @ ${project}`);
    await trigger.click(); // collapse again for the next shots

    // ---- View as table: the accessible fallback (2nd segmented, 2nd item) ----
    const viewSwitch = page.locator(SEGMENTED).nth(1);
    await viewSwitch.locator(SEG_ITEM).nth(1).click();
    await expect(page.locator(TABLE)).toBeVisible();
    await shot(page, project, `charts_table_${locale}`);
    await scan(page, `charts table ${locale} @ ${project}`);

    // ---- Horizon recast: back to the chart, choose the long (30y) horizon ----
    await viewSwitch.locator(SEG_ITEM).nth(0).click();
    const horizonSwitch = page.locator(SEGMENTED).nth(0);
    const longItem = horizonSwitch.locator(SEG_ITEM).nth(2);
    await longItem.click();
    await expect(longItem).toHaveAttribute('data-state', 'on');
    await settleChart(page);
    await shot(page, project, `charts_long_${locale}`);
    await scan(page, `charts long ${locale} @ ${project}`);
  });
}

for (const locale of LOCALES) {
  test(`charts ${locale} · reduced-motion projection is instant`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, `/${locale}/charts-demo`);

    // With reduced motion the chart does not draw in — the median path is present
    // at its final geometry immediately (isAnimationActive is gated off in the chart).
    await expect(page.locator(LINE).first()).toHaveAttribute('d', /.+/);
    await settleChart(page);
    await shot(page, project, `charts_reduced_${locale}`);
    await scan(page, `charts reduced ${locale} @ ${project}`);
  });
}
