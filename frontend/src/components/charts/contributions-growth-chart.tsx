"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Area,
  AreaChart,
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
 * ContributionsGrowthChart (DESIGN §12 "Your growth" — contributions vs growth). A
 * stacked area splitting your balance into the two honest halves: the money YOU put
 * in (sky, on the baseline) and the money it EARNED (green, stacked on top). The two
 * always sum to the same median balance the projection fan draws — growth is defined
 * as balance − contributions, so the split can never disagree with the fan.
 *
 * The teaching moment is the crossover: on a long horizon, the green "it earned" band
 * overtakes the sky "you added" band — compounding does more than your deposits. That
 * point is marked with a floating pill. Honest by construction: the Y axis starts at
 * 0 and is never zoomed. Never colour-alone (§11): both bands are directly legended +
 * labelled. Fully prop-driven — words from the caller, colours from the chart-theme.
 */

export type ContributionsPoint = {
  /** calendar year (the x value) */
  year: number
  /** cumulative money you put in: the initial pot + every monthly deposit so far */
  contributions: number
  /** money it earned so far: the balance minus what you put in (>= 0) */
  growth: number
  /** the total balance = contributions + growth (the projection's median line) */
  total: number
}

export type ContributionsGrowthLabels = {
  /** the "money you put in" band */
  contributions: string
  /** the "money it earned" band */
  growth: string
  /** the total-balance tooltip row */
  total: string
}

export type ContributionsGrowthChartProps = {
  data: ContributionsPoint[]
  /** the "growth overtakes contributions" marker + its floating pill label */
  crossover?: { year: number; label: string }
  labels: ContributionsGrowthLabels
  /** formats a franc value for the tooltip (full, locale-aware; from the caller) */
  formatValue: (value: number) => string
  /** formats a franc value for the Y axis ticks (compact, e.g. "CHF 60K") */
  formatAxisValue: (value: number) => string
  /** formats the tooltip title from a year (e.g. "In 2041") */
  formatYear: (year: number) => string
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

type ContributionsTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: ContributionsPoint }>
  labels: ContributionsGrowthLabels
  formatValue: (value: number) => string
  formatYear: (year: number) => string
}

/** Plain-language tooltip: what you added, what it earned (▲), and the total. */
function ContributionsTooltip({
  active,
  payload,
  labels,
  formatValue,
  formatYear,
}: ContributionsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={formatYear(d.year)}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.contributions} shape="band" />}
        label={labels.contributions}
        value={formatValue(d.contributions)}
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.growth} shape="band" />}
        label={labels.growth}
        value={formatValue(d.growth)}
        dir="▲"
        dirClassName="text-pos"
      />
      <ChartTooltipRow label={labels.total} value={formatValue(d.total)} />
    </ChartTooltipCard>
  )
}

type CrossoverViewBox = { x?: number; y?: number; width?: number; height?: number }

/**
 * The floating "growth takes over" pill above the crossover line (the beauty-bar
 * signature, re-skinned to our tokens): a white rounded pill ringed in brand green
 * with bold green text, sitting near the top of the plot. Decorative (pointer-events
 * off) — the split it marks is fully in the tooltip + the table.
 */
function CrossoverPill({
  viewBox,
  text,
}: {
  viewBox?: CrossoverViewBox
  text: string
}) {
  if (!viewBox || viewBox.x == null || viewBox.y == null) return null
  const lineX = viewBox.x
  const topY = viewBox.y
  const h = 22
  const w = Math.round(text.length * 6.6 + 20)
  // Anchor the pill's right edge just left of the crossover line so it grows leftward.
  // The crossover sits in the right half of the plot, so it never clips the edge.
  const rectX = lineX - w - 4
  const rectY = topY + 6
  return (
    <g pointerEvents="none">
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={h}
        rx={h / 2}
        fill="var(--white)"
        stroke={chartTheme.growth}
        strokeWidth={1.5}
      />
      <text
        x={rectX + w / 2}
        y={rectY + h / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={chartTheme.median}
        fontFamily={chartTheme.axis.fontFamily}
        fontSize={12}
        fontWeight={800}
      >
        {text}
      </text>
    </g>
  )
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

export function ContributionsGrowthChart({
  data,
  crossover,
  labels,
  formatValue,
  formatAxisValue,
  formatYear,
  ariaLabel,
}: ContributionsGrowthChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const contribGradientId = React.useId()
  const growthGradientId = React.useId()

  // Honest scale: start at 0 and round the top up to a clean step, so a stacked band
  // length is its true franc value — never truncate or zoom to exaggerate growth.
  const yMax = React.useMemo(() => {
    const peak = Math.max(...data.map((d) => d.total))
    return Math.ceil((peak * 1.08) / 1000) * 1000
  }, [data])

  return (
    // font-variant-numeric inherits into the SVG so axis numbers are tabular (.nums).
    // role="group" + a name names the region without hiding Recharts' keyboard layer.
    <div
      className="nums h-[380px] w-full sm:h-[340px]"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 24, right: 16, bottom: 4, left: 4 }}
          accessibilityLayer
        >
          <defs>
            {/* Same-hue multi-stop fades (DESIGN §12 richness pass): sky for the money
                you put in, green for the money it earned — glossy at the top of each
                band, near-clear at the bottom, so the stack reads dimensional. */}
            <ChartGradient
              id={contribGradientId}
              stops={chartTheme.gradients.contributions}
            />
            <ChartGradient
              id={growthGradientId}
              stops={chartTheme.gradients.growthStack}
            />
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={10}
            minTickGap={24}
            interval="preserveStartEnd"
            tickFormatter={(v: number) => String(v)}
          />
          <YAxis
            domain={[0, yMax]}
            width={72}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatAxisValue(v)}
          />
          <Tooltip
            cursor={{
              stroke: chartTheme.cursor.stroke,
              strokeDasharray: chartTheme.cursor.dash,
            }}
            content={
              <ContributionsTooltip
                labels={labels}
                formatValue={formatValue}
                formatYear={formatYear}
              />
            }
          />

          {/* Bottom band: the money YOU put in (sky), on the 0 baseline. */}
          <Area
            type="monotone"
            dataKey="contributions"
            stackId="balance"
            stroke={chartTheme.contributions}
            strokeWidth={2}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            fill={`url(#${contribGradientId})`}
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 4,
              fill: chartTheme.contributions,
              stroke: "var(--white)",
              strokeWidth: 2,
            }}
            isAnimationActive={animate}
            animationDuration={duration}
          />
          {/* Top band: the money it EARNED (green), stacked on the contributions. */}
          <Area
            type="monotone"
            dataKey="growth"
            stackId="balance"
            stroke={chartTheme.growth}
            strokeWidth={2}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            fill={`url(#${growthGradientId})`}
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 4,
              fill: chartTheme.growth,
              stroke: "var(--white)",
              strokeWidth: 2,
            }}
            isAnimationActive={animate}
            animationDuration={duration}
          />

          {/* The crossover — where "it earned" overtakes "you added" (a teaching beat,
              only shown when it happens within the horizon). */}
          {crossover ? (
            <ReferenceLine
              x={crossover.year}
              stroke={chartTheme.growth}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              ifOverflow="extendDomain"
              label={(props: { viewBox?: CrossoverViewBox }) => (
                <CrossoverPill viewBox={props.viewBox} text={crossover.label} />
              )}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
