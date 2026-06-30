import {expect, test, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 5 (app shell) gate. The shell is responsive: at `lg` it is a three-column
 * layout (fixed SidebarNav · centre · sticky StatusRail); below `lg` it folds to
 * a single column with the rail inline and a fixed bottom TabBar. So this spec
 * screenshots the dev-only `/shell` demo across every viewport in EN + FR and
 * asserts ZERO serious/critical axe violations (landmarks, focus, contrast).
 *
 * A second pair OPENS the mobile "More" bottom sheet (tab bar) and scans the open
 * overlay; a third pair re-opens it under `prefers-reduced-motion` and proves the
 * slide collapses to ~0s. The tab bar is hidden at `lg`, so the sheet tests skip
 * on the desktop project.
 */
const LOCALES = ['en', 'fr'] as const;

const LABELS = {
  en: {home: 'Home', explore: 'Explore', learn: 'Learn', cta: 'Build my plan'},
  fr: {home: 'Accueil', explore: 'Explorer', learn: 'Apprendre', cta: 'Créer mon plan'}
} as const;

const SHEET_TRIGGER = '[data-slot="sheet-trigger"]';
const SHEET_CONTENT = '[data-slot="sheet-content"]';

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

async function settleOverlay(page: Page, selector: string) {
  await page.locator(selector).evaluate((node) =>
    Promise.all(
      node.getAnimations({subtree: true}).map((a) => a.finished.catch(() => undefined))
    )
  );
}

// ---- Layout: the shell renders, lands you on Home, and passes axe everywhere ----
for (const locale of LOCALES) {
  test(`shell /${locale}/shell`, async ({page}, testInfo) => {
    const project = testInfo.project.name;
    const labels = LABELS[locale];
    await ready(page, `/${locale}/shell`);

    // Landmarks + skip link.
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
      page.getByRole('link', {name: locale === 'en' ? 'Skip to content' : 'Aller au contenu'})
    ).toBeAttached();
    expect(await page.getByRole('navigation').count()).toBeGreaterThan(0);

    // Active state: the visible nav marks Home as the current page (not colour-alone).
    const active = page.locator('[aria-current="page"]:visible');
    await expect(active.first()).toContainText(labels.home);

    // The single highlight CTA in the rail is reachable in both layout modes.
    await expect(page.getByRole('link', {name: labels.cta})).toBeVisible();

    await shot(page, project, `shell_${locale}`);
    await scan(page, `/${locale}/shell @ ${project}`);
  });
}

// ---- Mobile "More" sheet: the folded-away destinations + language toggle ----
for (const locale of LOCALES) {
  test(`shell ${locale} · More sheet`, async ({page}, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'tab bar (and its More button) is hidden at lg');
    const project = testInfo.project.name;
    const labels = LABELS[locale];
    await ready(page, `/${locale}/shell`);

    await page.locator(SHEET_TRIGGER).click();
    const sheet = page.locator(SHEET_CONTENT);
    await expect(sheet).toBeVisible();
    await settleOverlay(page, SHEET_CONTENT);

    // The two destinations that fold into "More" (Explore + Learn) are here.
    await expect(sheet.getByRole('link', {name: labels.explore})).toBeVisible();
    await expect(sheet.getByRole('link', {name: labels.learn})).toBeVisible();

    await shot(page, project, `shell_more_${locale}`, false);
    await scan(page, `more sheet ${locale} @ ${project}`);
  });
}

// ---- Reduced motion: the More sheet appears instantly (no slide) ----
for (const locale of LOCALES) {
  test(`shell ${locale} · reduced-motion More sheet is instant`, async ({page}, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'tab bar (and its More button) is hidden at lg');
    const project = testInfo.project.name;
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, `/${locale}/shell`);

    await page.locator(SHEET_TRIGGER).click();
    const sheet = page.locator(SHEET_CONTENT);
    await expect(sheet).toBeVisible();

    const duration = await sheet.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(seconds(duration), 'sheet slide under reduced motion').toBeLessThan(0.05);

    await settleOverlay(page, SHEET_CONTENT);
    await shot(page, project, `shell_more_reduced_${locale}`, false);
    await scan(page, `reduced more sheet ${locale} @ ${project}`);
  });
}
