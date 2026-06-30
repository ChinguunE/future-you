import {expect, test, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 4 (overlay & disclosure primitives) gate. The Dialog, Sheet and Tooltip
 * are portalled overlays, so unlike the static gallery this spec OPENS each one
 * and captures its open state, then runs axe-core on the opened overlay — the
 * focus trap, the visible focus ring, the dialog's accessible name and the text
 * contrast all have to clear WCAG-AA with zero serious/critical violations.
 *
 * The reduced-motion pair re-opens the Dialog under `prefers-reduced-motion` and
 * proves the open animation collapses to ~0s (the global media query in
 * globals.css), so the overlay appears instantly rather than zooming in. Runs
 * EN + FR across every configured viewport (mobile / tablet / desktop).
 */
const LOCALES = ['en', 'fr'] as const;

const DIALOG_TRIGGER = '[data-slot="dialog-trigger"]';
const DIALOG_CONTENT = '[data-slot="dialog-content"]';
const SHEET_TRIGGER = '[data-slot="sheet-trigger"]';
const SHEET_CONTENT = '[data-slot="sheet-content"]';
const TOOLTIP_TRIGGER = '[data-slot="tooltip-trigger"]';
const TOOLTIP_CONTENT = '[data-slot="tooltip-content"]';

function seconds(value: string): number {
  const n = parseFloat(value);
  return value.trim().endsWith('ms') ? n / 1000 : n;
}

async function ready(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await settleImages(page);
}

// Let a just-opened overlay settle before the screenshot: first wait out the
// open animation (the sheet slide / dialog zoom — up to ~300ms; instant under
// reduced motion), then wait for any illustration inside it to finish decoding
// so we capture the art, not a blank placeholder mid-flight.
async function settleOverlay(page: Page, selector: string) {
  await page.locator(selector).evaluate((node) =>
    Promise.all(
      node
        .getAnimations({subtree: true})
        .map((a) => a.finished.catch(() => undefined))
    )
  );
  await page.evaluate(async (sel) => {
    const root = document.querySelector(sel);
    if (!root) return;
    await Promise.all(
      Array.from(root.querySelectorAll('img')).map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), {once: true});
              img.addEventListener('error', () => resolve(), {once: true});
            })
      )
    );
  }, selector);
}

function shot(page: Page, project: string, name: string) {
  const dir = `screenshots/${project}`;
  mkdirSync(dir, {recursive: true});
  return page.screenshot({path: `${dir}/${name}.png`});
}

async function scan(page: Page, label: string) {
  const violations = await axeScan(page);
  logViolations(label, violations);
  expect(countSerious(violations), 'serious/critical axe violations').toBe(0);
}

for (const locale of LOCALES) {
  test(`overlays ${locale} · dialog + sheet + tooltip open states`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/style-guide`);

    // ---- Dialog: centred over the ink scrim ----
    await page.locator(DIALOG_TRIGGER).click();
    const dialog = page.locator(DIALOG_CONTENT);
    await expect(dialog).toBeVisible();
    await settleOverlay(page, DIALOG_CONTENT);
    await shot(page, project, `overlays_dialog_${locale}`);
    await scan(page, `dialog ${locale} @ ${project}`);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // ---- Bottom sheet: slides up over the dimmed backdrop ----
    await page.locator(SHEET_TRIGGER).click();
    const sheet = page.locator(SHEET_CONTENT);
    await expect(sheet).toBeVisible();
    await settleOverlay(page, SHEET_CONTENT);
    await shot(page, project, `overlays_sheet_${locale}`);
    await scan(page, `sheet ${locale} @ ${project}`);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    // ---- Tooltip: reachable on keyboard focus, not hover-only ----
    await page.locator(TOOLTIP_TRIGGER).focus();
    await expect(page.locator(TOOLTIP_CONTENT).first()).toBeVisible();
    await shot(page, project, `overlays_tooltip_${locale}`);
    await scan(page, `tooltip ${locale} @ ${project}`);
  });
}

for (const locale of LOCALES) {
  test(`overlays ${locale} · reduced-motion open is instant`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, `/${locale}/style-guide`);

    await page.locator(DIALOG_TRIGGER).click();
    const dialog = page.locator(DIALOG_CONTENT);
    await expect(dialog).toBeVisible();

    // The open (zoom+fade) animation must collapse to ~0 under reduced motion.
    const duration = await dialog.evaluate(
      (el) => getComputedStyle(el).animationDuration
    );
    expect(
      seconds(duration),
      'dialog open animation under reduced motion'
    ).toBeLessThan(0.05);

    await settleOverlay(page, DIALOG_CONTENT);
    await shot(page, project, `overlays_dialog_reduced_${locale}`);
    await scan(page, `reduced dialog ${locale} @ ${project}`);
  });
}
