import {Baloo_2, Nunito} from 'next/font/google';

/**
 * Self-hosted brand fonts (DESIGN §3). next/font downloads these at build time
 * and serves them from our own origin — no request ever reaches Google, which
 * keeps the security/CSP story tight (CLAUDE.md non-negotiable #2).
 *
 * Both are variable fonts, so we load the whole weight axis (no `weight` array)
 * and drive weight with CSS. `latin-ext` is included so every French accent
 * (é è ê à ç ù œ …) and ligature renders crisply — the app ships EN + FR.
 */

// Display / headings — our rounded, chunky "Feather" analog (weights 400–800).
export const baloo = Baloo_2({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-baloo',
  display: 'swap',
  adjustFontFallback: true
});

// Body / UI / numerals — rounded, legible, excellent tabular figures (200–1000).
export const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-nunito',
  display: 'swap',
  adjustFontFallback: true
});
