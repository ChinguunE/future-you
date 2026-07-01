"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
 * MixVsOptimalChart (DESIGN §12 "Your mix"). What tilting toward your picks changed,
 * per holding: two bars each — the OPTIMAL (policy) weight vs YOUR (tilted) weight.
 * The satellites you added (0 → a few %) are funded by trimming the core funds, so the
 * over/under deltas net to ~zero. Honest by construction: the value axis starts at a
 * true 0 (never truncated), the two series are named in the card legend (never
 * colour-alone), and the over-weight ▲ / under-weight ▼ direction is a glyph + words,
 * not colour, in the tooltip and table (§11). Fully prop-driven; colours from tokens.
 */

export type MixVsOptimalDatum = {
  ticker: string
  /** full holding name — a proper noun, shown in the tooltip */
  name: string
  /** the pre-tilt policy weight, 0..1 */
  optimal: number
  /** your tilted weight, 0..1 */
  your: number
  /** your − optimal (over-weight > 0 / under-weight < 0) */
  delta: number
}

export type MixVsOptimalLabels = {
  optimal: string
  your: string
  /** e.g. "more than the optimal mix" (for a ▲ over-weight) */
  over: string
  /** e.g. "less than the optimal mix" (for a ▼ under-weight) */
  under: string
  /** e.g. "same as optimal" */
  same: string
}

export type MixVsOptimalChartProps = {
  data: MixVsOptimalDatum[]
  labels: MixVsOptimalLabels
  /** formats a 0..1 weight as a percent (locale-aware) */
  formatShare: (value: number) => string
  ariaLabel: string
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

type MixTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: MixVsOptimalDatum }>
  labels: MixVsOptimalLabels
  formatShare: (value: number) => string
}

function MixTooltip({ active, payload, labels, formatShare }: MixTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  const dir = d.delta > 0.0005 ? "up" : d.delta < -0.0005 ? "down" : "flat"
  const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "→"
  const word = dir === "up" ? labels.over : dir === "down" ? labels.under : labels.same
  const dirClass =
    dir === "up" ? "text-pos" : dir === "down" ? "text-neg" : "text-text-muted"
  return (
    <ChartTooltipCard title={d.name}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.series[3]} shape="band" />}
        label={labels.optimal}
        value={formatShare(d.optimal)}
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.series[0]} shape="band" />}
        label={labels.your}
        value={formatShare(d.your)}
      />
      <ChartTooltipRow
        label={word}
        value={formatShare(Math.abs(d.delta))}
        dir={glyph}
        dirClassName={dirClass}
      />
    </ChartTooltipCard>
  )
}

export function MixVsOptimalChart({
  data,
  labels,
  formatShare,
  ariaLabel,
}: MixVsOptimalChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const optimalId = React.useId()
  const yourId = React.useId()

  // Honest value axis: always start at 0 and round the top up to a clean 10% mark, so
  // a bar's length is its true weight and nothing is truncated to exaggerate a gap.
  const xMax = React.useMemo(() => {
    const peak = Math.max(...data.flatMap((d) => [d.optimal, d.your]), 0)
    return Math.ceil((peak + 0.001) * 10) / 10
  }, [data])

  return (
    <div
      className="nums h-[380px] w-full"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
          barCategoryGap="22%"
          accessibilityLayer
        >
          <defs>
            {/* Glossy sheens matching the donut/treemap — sky for the policy mix,
                green for yours. Token-only stop arrays. */}
            <ChartGradient id={optimalId} stops={chartTheme.gradients.wedgeBond} />
            <ChartGradient id={yourId} stops={chartTheme.gradients.wedgeEquity} />
          </defs>

          <CartesianGrid
            horizontal={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            type="number"
            domain={[0, xMax]}
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={8}
            tickFormatter={(v: number) => formatShare(v)}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            width={88}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            content={
              <MixTooltip labels={labels} formatShare={formatShare} />
            }
          />

          <Bar
            dataKey="optimal"
            fill={`url(#${optimalId})`}
            stroke={chartTheme.series[3]}
            strokeWidth={1}
            radius={[0, chartTheme.bar.radius, chartTheme.bar.radius, 0]}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            <LabelList
              dataKey="optimal"
              position="right"
              formatter={(value: React.ReactNode) => formatShare(Number(value))}
              fill={chartTheme.annotation}
              fontFamily={chartTheme.axis.fontFamily}
              fontSize={11}
              fontWeight={700}
            />
          </Bar>
          <Bar
            dataKey="your"
            fill={`url(#${yourId})`}
            stroke={chartTheme.series[0]}
            strokeWidth={1}
            radius={[0, chartTheme.bar.radius, chartTheme.bar.radius, 0]}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            <LabelList
              dataKey="your"
              position="right"
              formatter={(value: React.ReactNode) => formatShare(Number(value))}
              fill={chartTheme.annotation}
              fontFamily={chartTheme.axis.fontFamily}
              fontSize={11}
              fontWeight={700}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
