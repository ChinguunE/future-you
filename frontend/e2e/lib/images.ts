import type {Page} from '@playwright/test';

/**
 * Trigger lazy-loading and wait until every <img> has settled, so a fullPage
 * screenshot shows the art rather than blank lazy placeholders. next/image only
 * sets a below-the-fold image's `src` once it scrolls into view, so we walk the
 * page top-to-bottom, then wait for each image to finish decoding.
 */
export async function settleImages(page: Page): Promise<void> {
  // Bring every lazy image into view to kick off its load.
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });

  // Wait for all of them to finish (loaded or errored — never hang).
  await page.evaluate(
    () =>
      Promise.all(
        Array.from(document.images).map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), {once: true});
                img.addEventListener('error', () => resolve(), {once: true});
              })
        )
      ).then(() => undefined)
  );
}
