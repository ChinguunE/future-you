import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 6 gate — the guided-flow journey path (/flow). Screenshots the path-map
 * screen in EN + FR across every viewport (mobile / tablet / desktop) for the
 * build → screenshot → refine loop, and asserts ZERO serious/critical axe
 * violations (DESIGN Skills Protocol).
 */
const ROUTES = ['/en/flow', '/fr/flow'];

for (const route of ROUTES) {
  test(`flow ${route}`, async ({page}, testInfo) => {
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.evaluate(() => document.fonts.ready);
    await settleImages(page);

    const slug = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    const dir = `screenshots/${testInfo.project.name}`;
    mkdirSync(dir, {recursive: true});
    await page.screenshot({path: `${dir}/${slug}.png`, fullPage: true});

    const violations = await axeScan(page);
    logViolations(`${route} @ ${testInfo.project.name}`, violations);
    expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
  });
}
