/**
 * The illustration system's public surface.
 *
 * Re-exports the generated catalogue (ids, paths, intrinsic sizes — see
 * `manifest.generated.ts`, refreshed by `npm run gen:illustrations`) and adds
 * the shared SIZING SCALE + box maths that let <Illustration> and <Sprout> place
 * any piece at a generous, aspect-correct size with no layout shift.
 */
export * from './manifest.generated';

import type {IllustrationMeta} from './manifest.generated';

/**
 * Named sizes = the longest edge in px. Deliberately GENEROUS — the art is the
 * personality of this product (DESIGN §8), so the defaults lean big and `hero`
 * gives a piece real, full-bleed presence. Callers may also pass a raw number.
 */
export const ILLUSTRATION_SIZES = {
  xs: 64, //   inline marker beside a word
  sm: 96, //   list-row / chip companion
  md: 144, //  card accent
  lg: 208, //  section character
  xl: 280, //  the guided-flow guide (Sprout's default)
  '2xl': 360, // a screen's hero character
  hero: 480 //  landing / celebratory full presence
} as const;

export type IllustrationSizeName = keyof typeof ILLUSTRATION_SIZES;
export type IllustrationSize = IllustrationSizeName | number;

/** Resolve a named size or raw number to the longest-edge pixel value. */
export function resolveSize(size: IllustrationSize): number {
  return typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
}

/**
 * Fit a piece into a box whose LONGEST edge is `longest` px, preserving the
 * art's true aspect ratio. The returned width/height seed the rendered box so
 * there is never a layout shift, and tall/wide pieces keep a consistent visual
 * weight rather than all being forced square.
 */
export function illustrationBox(
  meta: Pick<IllustrationMeta, 'width' | 'height'>,
  longest: number
): {width: number; height: number} {
  const {width, height} = meta;
  if (width >= height) {
    return {width: longest, height: Math.round((longest * height) / width)};
  }
  return {width: Math.round((longest * width) / height), height: longest};
}
