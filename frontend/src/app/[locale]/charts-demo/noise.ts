/**
 * Deterministic hashed-sine noise, shared by the dev-only sample-data builders (the
 * Wave-D price tape + the Wave-F holdings sparklines). A fractional sine gives a jagged,
 * real-looking walk with NO Math.random and NO Date — so it is identical on the server
 * and the client and an SSR-rendered figure can't tear on hydration. Three decorrelated
 * hashes summed approximate a standard-normal shock (a gentle central-limit blur).
 *
 * Hoisted out of stock-data.ts (Slice 9, Wave F) so the price tape and the sparklines
 * share ONE noise source instead of two copies — same behaviour, single definition.
 */

/** A deterministic pseudo-random value in [−1, 1] from an index (fractional sine). */
export function hash(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return 2 * (s - Math.floor(s)) - 1;
}

/** An approx standard-normal shock for step i (sum of three decorrelated hashes). */
export function shock(i: number): number {
  return (hash(i) + hash(i * 2.13 + 5.1) + hash(i * 0.73 + 11.7)) / Math.sqrt(3);
}
