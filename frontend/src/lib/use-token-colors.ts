"use client"

import * as React from "react"

/**
 * useTokenColors — resolve design-token CSS custom properties to concrete colour
 * strings ON THE CLIENT, for charting libraries (nivo) that must PARSE a colour to
 * compute derived shades (child-ring luminance, label contrast). Recharts takes
 * `var(--token)` strings straight as SVG attributes, but nivo runs those strings
 * through @nivo/colors, which can't parse `var(--…)`.
 *
 * This keeps the design tokens the single source of truth (non-negotiable #3): we
 * READ the live computed value from the document rather than hard-coding a hex, so a
 * token change in globals.css still flows through.
 *
 * Implemented with useSyncExternalStore so there's no setState-in-effect: during
 * hydration it returns the empty server snapshot (matching SSR, where there's no
 * document), then React swaps to the client snapshot on commit — which is exactly
 * when nivo's Responsive* wrappers first measure and render anyway. Snapshots are
 * cached per name-set so the reference stays stable across renders (a hard
 * requirement of useSyncExternalStore) and the DOM is read only once.
 *
 * @param names bare custom-property names, e.g. ["--chart-1", "--ink"]
 * @returns a map name → resolved colour (e.g. "#247A5E"); empty during hydration
 */
const EMPTY: Record<string, string> = {}
const cache = new Map<string, Record<string, string>>()

/**
 * Read one token's final colour. Most engines return the fully-substituted computed
 * value (e.g. --chart-1 → "#247A5E"); some return the literal "var(--green-600)". We
 * follow a single `var(--x)` reference until we reach a concrete value, so either
 * behaviour yields a parseable colour (design tokens are ≤ 2 levels deep here).
 */
function resolve(
  styles: CSSStyleDeclaration,
  name: string,
  depth = 0
): string {
  const value = styles.getPropertyValue(name).trim()
  const ref = value.match(/^var\((--[a-zA-Z0-9-]+)\)$/)
  if (ref && depth < 6) return resolve(styles, ref[1], depth + 1)
  return value
}

function readColors(key: string): Record<string, string> {
  const cached = cache.get(key)
  if (cached) return cached
  const styles = getComputedStyle(document.documentElement)
  const next: Record<string, string> = {}
  for (const name of key.split(",")) {
    // Design tokens are static at runtime, so caching the resolved colour is safe.
    next[name] = resolve(styles, name)
  }
  cache.set(key, next)
  return next
}

// The values never change after mount, so the store never notifies (no unsubscribe).
const subscribeNoop = () => () => {}

export function useTokenColors(names: readonly string[]): Record<string, string> {
  const key = names.join(",")
  const getSnapshot = React.useCallback(() => readColors(key), [key])
  const getServerSnapshot = React.useCallback(() => EMPTY, [])
  return React.useSyncExternalStore(subscribeNoop, getSnapshot, getServerSnapshot)
}
