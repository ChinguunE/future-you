import {expect, test, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

import {axeScan, countSerious, logViolations} from './lib/a11y';
import {settleImages} from './lib/images';

/**
 * Slice 7 (teaching primitives) gate — the EquationBlock and the GlossaryTerm
 * popover (DESIGN §5). Captures three states the static gallery can't show on its
 * own: the block COLLAPSED (plain-language answer + "show the maths" toggle), the
 * block EXPANDED (the KaTeX formula, symbol rows, worked example, "why"), and an
 * OPEN glossary popover — then runs axe-core on each, requiring zero
 * serious/critical WCAG-AA violations (the KaTeX MathML alt, the toggle's
 * expanded state, the dotted-token button label, and text contrast all have to
 * clear the bar). The reduced-motion pair re-opens the popover under
 * `prefers-reduced-motion` and proves the open animation collapses to ~0s (the
 * global media query). Runs EN + FR across every viewport (mobile/tablet/desktop).
 */
const LOCALES = ['en', 'fr'] as const;

const EQ_TRIGGER = '[data-slot="accordion-trigger"]';
const EQ_CONTENT = '[data-slot="accordion-content"]';
const GLOSSARY_TERM = '[data-slot="glossary-term"]';
const POPOVER_CONTENT = '[data-slot="popover-content"]';

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

// Wait out any open animation on an element (and its subtree), then any image
// inside it (the reward Sprout), before capturing — so we shoot the settled art.
async function settleAnimations(page: Page, selector: string) {
  const node = page.locator(selector).first();
  await node.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({subtree: true})
        .map((a) => a.finished.catch(() => undefined))
    )
  );
  await node.evaluate((el) =>
    Promise.all(
      Array.from(el.querySelectorAll('img')).map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), {once: true});
              img.addEventListener('error', () => resolve(), {once: true});
            })
      )
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
  test(`teaching ${locale} · equation block + glossary popover`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await ready(page, `/${locale}/teaching-primitives`);

    // ---- Collapsed: the plain-language answer + the "show the maths" toggle ----
    const trigger = page.locator(EQ_TRIGGER);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await shot(page, project, `teaching_collapsed_${locale}`);
    await scan(page, `teaching collapsed ${locale} @ ${project}`);

    // ---- Expanded: the cream maths card (formula · symbols · example · why) ----
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(EQ_CONTENT)).toBeVisible();
    await settleAnimations(page, EQ_CONTENT);
    await shot(page, project, `teaching_expanded_${locale}`);
    await scan(page, `teaching expanded ${locale} @ ${project}`);

    // ---- Open glossary popover: definition + "Learn more" ----
    await page.locator(GLOSSARY_TERM).first().click();
    const popover = page.locator(POPOVER_CONTENT);
    await expect(popover).toBeVisible();
    await settleAnimations(page, POPOVER_CONTENT);
    await shot(page, project, `teaching_glossary_${locale}`);
    await scan(page, `teaching glossary ${locale} @ ${project}`);

    // Esc dismisses and returns focus to the token (Radix).
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(page.locator(GLOSSARY_TERM).first()).toBeFocused();
  });
}

for (const locale of LOCALES) {
  test(`teaching ${locale} · reduced-motion popover is instant`, async ({
    page
  }, testInfo) => {
    const project = testInfo.project.name;
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, `/${locale}/teaching-primitives`);

    await page.locator(GLOSSARY_TERM).first().click();
    const popover = page.locator(POPOVER_CONTENT);
    await expect(popover).toBeVisible();

    // The open (zoom+fade) animation must collapse to ~0 under reduced motion.
    const duration = await popover.evaluate(
      (el) => getComputedStyle(el).animationDuration
    );
    expect(
      seconds(duration),
      'popover open animation under reduced motion'
    ).toBeLessThan(0.05);

    await settleAnimations(page, POPOVER_CONTENT);
    await shot(page, project, `teaching_glossary_reduced_${locale}`);
    await scan(page, `teaching reduced glossary ${locale} @ ${project}`);
  });
}
