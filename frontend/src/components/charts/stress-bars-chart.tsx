"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { chartTheme } from "@/lib/chart-theme"
import { ChartGradient } from "@/components/charts/chart-defs"
import {
  ChartTooltipCard,
  ChartTooltipRow,
  TooltipSwatch,
} from "@/components/charts/chart-tooltip"

/**
 * StressBarsChart (DESIGN §12 "Scenario & comparison" — how a bad year could feel). NOT
 * a replay of any real crisis: a set of illustrative rough-year losses at three rarities
 * (a 1-in-20 year, a 1-in-40, a severe 1-in-100), each modelled from your own risk. For
 * every rarity two bars sink below a 0% "a normal year" waterline: a plain stock index's
 * DEEPER fall (--neg) and your mix's SHALLOWER, cushioned fall (--sky) — so diversification's
 * cushion is unmissable. Honest by construction: the bars hang from a true 0% line and their
 * length is the real loss. Never colour-alone (§11): each bar carries a ▼ + a direct label +
 * its number in the tooltip and the table. Fully prop-driven; colours from the chart-theme.
 */

export type StressBarDatum = {
  /** a stable key for React */
  key: string
  /** the short x-axis label (e.g. "1 in 20") — kept compact so 3 fit on a phone */
  severity: string
  /** the full label for the tooltip title (e.g. "A rough year (1 in 20)") */
  severityFull: string
  /** your mix's fall that bad year (a negative fraction) */
  yourLoss: number
  /** a plain stock index's fall that bad year (a deeper negative fraction) */
  indexLoss: number
  /** yourLoss − indexLoss (> 0: how many points shallower your mix falls) */
  cushion: number
}

export type StressBarsLabels = {
  /** legend + tooltip row for the plain-index bar */
  index: string
  /** legend + tooltip row for your-mix bar */
  your: string
  /** tooltip row: how much less your mix fell */
  cushion: string
  /** the 0% waterline annotation */
  waterline: string
}

export type StressBarsChartProps = {
  data: StressBarDatum[]
  labels: StressBarsLabels
  /** formats a 0..1 return fraction as a signed percent (e.g. "−11.6%") */
  formatPercent: (value: number) => string
  /** formats the cushion as a signed points gap (e.g. "+6.6 pts shallower") */
  formatCushion: (value: number) => string
  ariaLabel: string
}

type StressTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: StressBarDatum }>
  labels: StressBarsLabels
  formatPercent: (value: number) => string
  formatCushion: (value: number) => string
}

/** Plain-language tooltip: a plain index's fall (▼), your cushioned fall (▼), the gap. */
function StressTooltip({
  active,
  payload,
  labels,
  formatPercent,
  formatCushion,
}: StressTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={d.severityFull}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.loss} shape="band" />}
        label={labels.index}
        value={formatPercent(d.indexLoss)}
        dir="▼"
        dirClassName="text-neg"
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.cushioned} shape="band" />}
        label={labels.your}
        value={formatPercent(d.yourLoss)}
        dir="▼"
        dirClassName="text-neg"
      />
      <ChartTooltipRow label={labels.cushion} value={formatCushion(d.cushion)} />
    </ChartTooltipCard>
  )
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

export function StressBarsChart({
  data,
  labels,
  formatPercent,
  formatCushion,
  ariaLabel,
}: StressBarsChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const indexId = React.useId()
  const yourId = React.useId()

  // Honest scale: the bars hang from a true 0%, and the floor rounds DOWN past the
  // deepest fall to a clean 5% step, so a bar's length equals its real loss. A sliver of
  // headroom above 0 keeps the waterline label off the very top edge.
  const [floor, headroom] = React.useMemo(() => {
    const deepest = Math.min(...data.map((d) => Math.min(d.yourLoss, d.indexLoss)))
    return [Math.floor((deepest - 0.02) / 0.05) * 0.05, 0.015]
  }, [data])

  return (
    // font-variant-numeric inherits into the SVG so axis numbers are tabular (.nums).
    // role="group" + a name names the region without hiding Recharts' keyboard layer.
    <div
      className="nums h-[360px] w-full sm:h-[340px]"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 24, right: 16, bottom: 4, left: 4 }}
          barCategoryGap="22%"
          accessibilityLayer
        >
          <defs>
            {/* Glossy sheens: --neg for the index's deeper fall, --sky for your cushioned one. */}
            <ChartGradient id={indexId} stops={chartTheme.gradients.stressIndex} />
            <ChartGradient id={yourId} stops={chartTheme.gradients.stressYou} />
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            dataKey="severity"
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={10}
          />
          <YAxis
            domain={[floor, headroom]}
            width={56}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatPercent(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            content={
              <StressTooltip
                labels={labels}
                formatPercent={formatPercent}
                formatCushion={formatCushion}
              />
            }
          />

          {/* A plain stock index's deeper fall — the scary reference (left bar). */}
          <Bar
            dataKey="indexLoss"
            fill={`url(#${indexId})`}
            stroke={chartTheme.scenario.loss}
            strokeWidth={0.75}
            radius={[0, 0, chartTheme.bar.radius, chartTheme.bar.radius]}
            isAnimationActive={animate}
            animationDuration={duration}
          />
          {/* Your mix's shallower, cushioned fall (right bar). */}
          <Bar
            dataKey="yourLoss"
            fill={`url(#${yourId})`}
            stroke={chartTheme.scenario.cushioned}
            strokeWidth={0.75}
            radius={[0, 0, chartTheme.bar.radius, chartTheme.bar.radius]}
            isAnimationActive={animate}
            animationDuration={duration}
          />

          {/* The 0% "a normal year" waterline — the bars sink below it. */}
          <ReferenceLine
            y={0}
            stroke={chartTheme.scenario.waterline}
            strokeWidth={2}
            strokeDasharray="6 5"
            ifOverflow="extendDomain"
            label={{
              value: labels.waterline,
              position: "insideTopLeft",
              fill: chartTheme.annotation,
              fontFamily: chartTheme.axis.fontFamily,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
