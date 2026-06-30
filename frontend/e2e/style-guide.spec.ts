import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';

/**
 * Slice 1 (design tokens) gate. Unlike the Phase-0 smoke test, this asserts ZERO
 * serious/critical axe violations on the token gallery — the screenshot → refine
 * loop fails the slice otherwise (DESIGN Skills Protocol). Runs EN + FR across
 * every configured viewport (mobile / tablet / desktop).
 */
const ROUTES = ['/en/style-guide', '/fr/style-guide'];

for (const route of ROUTES) {
  test(`style-guide ${route}`, async ({page}, testInfo) => {
    await page.goto(route);
    await page.waitForLoadState('load');
    // Let next/font swap settle so the screenshot shows Baloo 2 / Nunito.
    await page.evaluate(() => document.fonts.ready);

    const slug = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    const dir = `screenshots/${testInfo.project.name}`;
    mkdirSync(dir, {recursive: true});
    await page.screenshot({path: `${dir}/${slug}.png`, fullPage: true});

    const violations = await axeScan(page);
    logViolations(`${route} @ ${testInfo.project.name}`, violations);
    expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
  });
}
