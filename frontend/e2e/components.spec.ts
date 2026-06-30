import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 3 (core pressable primitives) gate. Pairs with style-guide.spec.ts: that
 * one screenshots the gallery under normal motion, this one re-runs it with
 * `prefers-reduced-motion: reduce` across the same EN/FR × viewport matrix — and
 * proves the signature button's press-sink really does drop to instant (the
 * transition collapses to ~0s), not just that it looks the same. Plus a real
 * mouse-down capture of the sunk state. Zero serious/critical axe violations is
 * required, every label having already been picked for AA in the token layer.
 */
const LOCALES = ['en', 'fr'] as const;

const PRIMARY = '[data-slot="button"][data-variant="primary"]';

function seconds(value: string): number {
  // getComputedStyle gives "0.08s", "80ms", or "0.0001s" under reduced motion.
  const n = parseFloat(value);
  return value.trim().endsWith('ms') ? n / 1000 : n;
}

async function ready(page: import('@playwright/test').Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await settleImages(page);
}

for (const locale of LOCALES) {
  test(`components ${locale} · reduced-motion press is instant`, async ({page}, testInfo) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, `/${locale}/style-guide`);

    // The press transition must collapse to ~0 so the sink is immediate.
    const duration = await page.locator(PRIMARY).first().evaluate(
      (el) => getComputedStyle(el).transitionDuration
    );
    expect(seconds(duration), 'press transition under reduced motion').toBeLessThan(
      0.05
    );

    const dir = `screenshots/${testInfo.project.name}`;
    mkdirSync(dir, {recursive: true});
    await page.screenshot({
      path: `${dir}/components_reduced_${locale}.png`,
      fullPage: true
    });

    const violations = await axeScan(page);
    logViolations(`reduced ${locale} @ ${testInfo.project.name}`, violations);
    expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
  });
}

for (const locale of LOCALES) {
  test(`components ${locale} · pressed state + timed transition`, async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'capture the pressed state once, on desktop'
    );
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await ready(page, `/${locale}/style-guide`);

    const button = page.locator(PRIMARY).first();
    // With motion allowed the press eases over the configured 80ms.
    const duration = await button.evaluate(
      (el) => getComputedStyle(el).transitionDuration
    );
    expect(seconds(duration), 'press transition with motion').toBeGreaterThan(0.05);

    // Hold the button down and capture the genuinely-sunk :active state. The
    // button lives below the fold, so bring it into view before clipping.
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const dir = `screenshots/${testInfo.project.name}`;
      mkdirSync(dir, {recursive: true});
      await page.screenshot({
        path: `${dir}/components_pressed_${locale}.png`,
        clip: {
          x: Math.max(0, box.x - 24),
          y: Math.max(0, box.y - 24),
          width: box.width + 160,
          height: box.height + 64
        }
      });
      await page.mouse.up();
    }
  });
}
