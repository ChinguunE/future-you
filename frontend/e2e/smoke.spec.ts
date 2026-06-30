import {test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, logViolations} from './lib/a11y';

/**
 * Slice 0 smoke test: proves the harness boots the app, navigates both locales,
 * captures a full-page screenshot per viewport, and runs an axe scan.
 * It does NOT assert zero violations yet — the current page is the deliberately
 * plain Phase-0 placeholder. Slice 1 (the design system) turns axe into a gate.
 */
const ROUTES = ['/en', '/fr'];

for (const route of ROUTES) {
  test(`smoke ${route}`, async ({page}, testInfo) => {
    await page.goto(route);
    await page.waitForLoadState('load');

    const slug = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
    const dir = `screenshots/${testInfo.project.name}`;
    mkdirSync(dir, {recursive: true});
    await page.screenshot({path: `${dir}/${slug}.png`, fullPage: true});

    const violations = await axeScan(page);
    logViolations(`${route} @ ${testInfo.project.name}`, violations);
  });
}
