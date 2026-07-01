"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { chartTheme } from "@/lib/chart-theme"
import { ChartGradient } from "@/components/charts/chart-defs"
import {
  ChartTooltipCard,
  ChartTooltipRow,
  TooltipSwatch,
} from "@/components/charts/chart-tooltip"

/**
 * AllocationDonutChart (DESIGN §12 "Your mix"). The plainest first question — "what
 * am I invested in?" — as a glossy donut of the four sleeves, with a headline KPI in
 * the hole. Honest by construction: every wedge is also named + numbered in the card
 * legend and the table, so meaning never rests on colour (§11); the arc lengths are
 * the true weights (they sum to 100%). Fully prop-driven — all words + the centre KPI
 * come from the caller (i18n stays in the page), all colours from the chart-theme.
 */

export type AllocationSleeveKey = "equity" | "bond" | "cash" | "diversifier"

export type AllocationSlice = {
  /** sleeve key — selects the wedge gradient + swatch colour */
  sleeve: AllocationSleeveKey
  /** localised sleeve label, e.g. "Equity" */
  label: string
  /** the sleeve weight, 0..1 */
  value: number
}

export type AllocationDonutChartProps = {
  slices: AllocationSlice[]
  /** the big number in the hole + its one-line label (already localised/formatted) */
  center: { value: string; label: string }
  /** row label in the hover tooltip, e.g. "Share of your mix" */
  shareLabel: string
  /** formats a 0..1 weight as a percent (locale-aware; from the caller) */
  formatShare: (value: number) => string
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

/** The glossy same-hue wedge sheens, one per sleeve — token-only (chart-theme). */
const WEDGE_STOPS = {
  equity: chartTheme.gradients.wedgeEquity,
  bond: chartTheme.gradients.wedgeBond,
  cash: chartTheme.gradients.wedgeCash,
  diversifier: chartTheme.gradients.wedgeDiversifier,
}

type DonutTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: AllocationSlice }>
  shareLabel: string
  formatShare: (value: number) => string
}

function DonutTooltip({
  active,
  payload,
  shareLabel,
  formatShare,
}: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={d.label}>
      <ChartTooltipRow
        swatch={
          <TooltipSwatch color={chartTheme.sleeveColor[d.sleeve]} shape="band" />
        }
        label={shareLabel}
        value={formatShare(d.value)}
      />
    </ChartTooltipCard>
  )
}

export function AllocationDonutChart({
  slices,
  center,
  shareLabel,
  formatShare,
  ariaLabel,
}: AllocationDonutChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const gradientBase = React.useId()
  const idFor = (sleeve: AllocationSleeveKey) => `${gradientBase}-${sleeve}`

  return (
    // role="group" + a name (not role="img"): the numbers live in the region's aria
    // label + the "view as table" fallback, so the decorative centre KPI is aria-hidden.
    <div
      className="nums relative h-[300px] w-full"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            {slices.map((s) => (
              <ChartGradient
                key={s.sleeve}
                id={idFor(s.sleeve)}
                stops={WEDGE_STOPS[s.sleeve]}
              />
            ))}
          </defs>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="94%"
            paddingAngle={1.5}
            startAngle={90}
            endAngle={-270}
            stroke="var(--white)"
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            {slices.map((s) => (
              <Cell key={s.sleeve} fill={`url(#${idFor(s.sleeve)})`} />
            ))}
          </Pie>
          <Tooltip
            content={
              <DonutTooltip shareLabel={shareLabel} formatShare={formatShare} />
            }
          />
        </PieChart>
      </ResponsiveContainer>

      {/* The headline KPI in the hole (e.g. "60% · in growth assets"). Decorative
          duplication of data already in the aria label + legend + table, so it's
          hidden from assistive tech to avoid a double announcement. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <span className="font-display text-[2rem] leading-none font-extrabold text-ink">
          {center.value}
        </span>
        <span className="mt-1 max-w-28 text-small leading-tight text-text-muted">
          {center.label}
        </span>
      </div>
    </div>
  )
}
