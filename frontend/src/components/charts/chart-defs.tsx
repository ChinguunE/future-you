import * as React from "react"

/**
 * chart-defs — shared SVG <defs> builders for the richer chart fills (DESIGN §12
 * richness pass). Recharts renders arbitrary SVG passed as chart children, so a
 * chart drops these inside its own <defs>. Colours come only from the chart-theme
 * stop arrays (token `var(--…)` strings), so no chart hand-rolls colour stops and
 * the gradients can never drift from the palette (non-negotiable #3).
 *
 * No client directive needed — the parent chart is already a client component.
 */

export type GradientStop = {
  offset: string
  /** a token colour string, e.g. `var(--green-500)` */
  color: string
  opacity: number
}

/**
 * One token-driven vertical <linearGradient> (top → bottom, how our area fills fade).
 * Pass `vertical={false}` for a left → right sweep.
 */
export function ChartGradient({
  id,
  stops,
  vertical = true,
}: {
  id: string
  stops: readonly GradientStop[]
  vertical?: boolean
}) {
  return (
    <linearGradient
      id={id}
      x1="0"
      y1="0"
      x2={vertical ? "0" : "1"}
      y2={vertical ? "1" : "0"}
    >
      {stops.map((s) => (
        <stop
          key={s.offset}
          offset={s.offset}
          stopColor={s.color}
          stopOpacity={s.opacity}
        />
      ))}
    </linearGradient>
  )
}
