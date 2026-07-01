import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 6 gate — the guided flow (/flow). 6a is the journey-path MAP; 6b adds
 * the interactive FlowChrome + a risk-quiz step. Screenshots the path AND the
 * quiz step (`?step=quiz`) in EN + FR across every viewport for the build →
 * screenshot → refine loop, asserts ZERO serious/critical axe violations, proves
 * the path → quiz interaction (coin tap → question, answer gates Continue), and
 * checks the quiz renders cleanly under prefers-reduced-motion (DESIGN §7/§11).
 */
const ROUTES = ['/en/flow', '/fr/flow', '/en/flow?step=quiz', '/fr/flow?step=quiz'];

async function settle(page: import('@playwright/test').Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await settleImages(page);
  // Let the one-shot progress-bar climb finish so the shot is deterministic.
  await page.waitForTimeout(700);
}

for (const route of ROUTES) {
  test(`flow ${route}`, async ({page}, testInfo) => {
    await page.goto(route);
    await settle(page);

    const slug = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    const dir = `screenshots/${testInfo.project.name}`;
    mkdirSync(dir, {recursive: true});
    await page.screenshot({path: `${dir}/${slug}.png`, fullPage: true});

    const violations = await axeScan(page);
    logViolations(`${route} @ ${testInfo.project.name}`, violations);
    expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
  });
}

test('flow path -> quiz interaction', async ({page}, testInfo) => {
  await page.goto('/en/flow');
  await settle(page);

  // Tap the current "Comfort with risk" coin → slides into the quiz step.
  // force: the coin's infinite idle bob means it is never "stable" for Playwright.
  await page.locator('#risk a').click({force: true});

  const question = page.getByRole('heading', {name: /dropped 20%/i});
  await expect(question).toBeVisible();

  // In-lesson chrome: a real progressbar carrying the human "Step 3 of 4".
  const bar = page.getByRole('progressbar');
  await expect(bar).toHaveAttribute('aria-valuetext', 'Step 3 of 4');
  await expect(bar).toHaveAttribute('aria-valuenow', '3');

  // Continue is gated until an answer is chosen (never colour-alone selection).
  const cont = page.getByRole('button', {name: 'Continue'});
  await expect(cont).toBeDisabled();
  await page.getByRole('radio', {name: /Wait and see/i}).click();
  await expect(cont).toBeEnabled();

  // Capture the answered state: the selected chip (green fill + check + depth)
  // and the now-vivid 3D Continue button.
  const dir = `screenshots/${testInfo.project.name}`;
  mkdirSync(dir, {recursive: true});
  await page.waitForTimeout(450); // let the chip-pop settle
  await page.screenshot({path: `${dir}/en_flow_quiz_answered.png`, fullPage: true});

  // Back returns to the map.
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.getByRole('heading', {name: 'Your journey'})).toBeVisible();
});

test('flow quiz reduced-motion', async ({page}, testInfo) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/en/flow?step=quiz');
  await settle(page);

  const dir = `screenshots/${testInfo.project.name}`;
  mkdirSync(dir, {recursive: true});
  await page.screenshot({path: `${dir}/en_flow_quiz_reduced.png`, fullPage: true});

  // The bar still reaches its value instantly; the question is still there.
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  await expect(page.getByRole('heading', {name: /dropped 20%/i})).toBeVisible();

  const violations = await axeScan(page);
  logViolations(`reduced quiz @ ${testInfo.project.name}`, violations);
  expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
});
