"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
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
import type { RollingPoint } from "@/app/[locale]/charts-demo/scenario-data"

/**
 * RollingReturnsChart (DESIGN §12 "Scenario & comparison" — rolling returns). The range
 * of ANNUALISED returns you'd expect over different holding lengths: a shaded p10–p90 band
 * (a rough run vs a good one) with the median line through it. The story is the SHAPE — the
 * band is wide over one year and narrows to a tight neck over ten, because good and bad
 * years average out the longer you hold (σ shrinks with √n). A 0% "break even" rule shows
 * where a rough run turns from a loss into a gain: past that hold length even the p10 edge
 * clears 0%. Honest by construction — a range of futures, never a false single line, on a
 * true 0% axis. Never colour-alone (§11): band + median directly labelled + ▲/▼ in the
 * tooltip. Fully prop-driven; colours from the chart-theme.
 */

export type RollingReturnsLabels = {
  /** the median annualised-return line */
  median: string
  /** the upper (p90) edge — a good run */
  good: string
  /** the lower (p10) edge — a rough run */
  rough: string
}

export type RollingReturnsChartProps = {
  data: RollingPoint[]
  /** the hold length where a rough run (p10) first clears 0% + its on-chart label */
  breakeven?: { years: number; label: string }
  /** the 0% "break even" rule label */
  breakevenRuleLabel: string
  labels: RollingReturnsLabels
  /** formats a 0..1 return fraction as a signed percent (e.g. "+5.5%") */
  formatReturn: (value: number) => string
  /** formats a holding length for the tooltip title (e.g. "A 3-year hold") */
  formatYears: (years: number) => string
  /** formats a holding length compactly for the x-axis ticks (e.g. "3y") */
  formatYearsAxis: (years: number) => string
  ariaLabel: string
}

type RollingDatum = RollingPoint & { band: [number, number] }

type RollingTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: RollingDatum }>
  labels: RollingReturnsLabels
  formatReturn: (value: number) => string
  formatYears: (years: number) => string
}

/** Plain-language tooltip: the expected return, a good run (▲), a rough run (▼). */
function RollingTooltip({
  active,
  payload,
  labels,
  formatReturn,
  formatYears,
}: RollingTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={formatYears(d.years)}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.median} shape="line" />}
        label={labels.median}
        value={formatReturn(d.median)}
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.band} shape="band" />}
        label={labels.good}
        value={formatReturn(d.p90)}
        dir="▲"
        dirClassName="text-pos"
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.band} shape="band" />}
        label={labels.rough}
        value={formatReturn(d.p10)}
        dir="▼"
        dirClassName="text-neg"
      />
    </ChartTooltipCard>
  )
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

const HOLD_TICKS = [1, 3, 5, 10] as const

export function RollingReturnsChart({
  data,
  breakeven,
  breakevenRuleLabel,
  labels,
  formatReturn,
  formatYears,
  formatYearsAxis,
  ariaLabel,
}: RollingReturnsChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const bandGradientId = React.useId()

  // The band is drawn from a [low, high] tuple per point (Recharts range area).
  const rows: RollingDatum[] = React.useMemo(
    () => data.map((d) => ({ ...d, band: [d.p10, d.p90] })),
    [data]
  )

  // Honest scale: span the true min p10 → max p90, rounded to a clean 5% step, so the
  // band's narrowing is real — never zoomed. Includes the negative short-hold p10.
  const [lo, hi] = React.useMemo(() => {
    const min = Math.min(...data.map((d) => d.p10))
    const max = Math.max(...data.map((d) => d.p90))
    return [Math.floor(min / 0.05) * 0.05, Math.ceil(max / 0.05) * 0.05]
  }, [data])

  return (
    <div
      className="nums h-[380px] w-full sm:h-[340px]"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 24, right: 16, bottom: 4, left: 4 }}
          accessibilityLayer
        >
          <defs>
            {/* The same glossy green fan the growth projection uses — a range of futures,
                narrowing as the hold grows. */}
            <ChartGradient
              id={bandGradientId}
              stops={chartTheme.gradients.growthBand}
            />
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            type="number"
            dataKey="years"
            domain={[1, 10]}
            ticks={[...HOLD_TICKS]}
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={10}
            tickFormatter={(v: number) => formatYearsAxis(v)}
          />
          <YAxis
            domain={[lo, hi]}
            width={56}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatReturn(v)}
          />
          <Tooltip
            cursor={{
              stroke: chartTheme.cursor.stroke,
              strokeDasharray: chartTheme.cursor.dash,
            }}
            content={
              <RollingTooltip
                labels={labels}
                formatReturn={formatReturn}
                formatYears={formatYears}
              />
            }
          />

          {/* The 0% "break even" rule — above it a rough run is still a gain. */}
          <ReferenceLine
            y={0}
            stroke={chartTheme.scenario.waterline}
            strokeWidth={2}
            strokeDasharray="6 5"
            ifOverflow="extendDomain"
            label={{
              value: breakevenRuleLabel,
              position: "insideBottomLeft",
              fill: chartTheme.annotation,
              fontFamily: chartTheme.axis.fontFamily,
              fontSize: 12,
              fontWeight: 700,
            }}
          />

          {/* The p10–p90 fan — a range of futures, narrowing with the hold. */}
          <Area
            type="monotone"
            dataKey="band"
            stroke={chartTheme.scenario.bandStroke}
            strokeWidth={1}
            fill={`url(#${bandGradientId})`}
            fillOpacity={1}
            isAnimationActive={animate}
            animationDuration={duration}
            activeDot={false}
          />
          {/* A soft glow beneath the median so it lifts off the fan (decorative depth). */}
          <Line
            type="monotone"
            dataKey="median"
            stroke={chartTheme.scenario.band}
            strokeWidth={chartTheme.glow.width}
            strokeOpacity={chartTheme.glow.opacity}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationDuration={duration}
          />
          {/* The expected (median) annualised return — flat, because the AVERAGE doesn't
              change with the hold; only the range around it tightens. */}
          <Line
            type="monotone"
            dataKey="median"
            stroke={chartTheme.scenario.median}
            strokeWidth={chartTheme.line.width}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            dot={false}
            isAnimationActive={animate}
            animationDuration={duration}
          />

          {/* Where a rough run (the p10 edge) first crosses 0% — a soft halo + crisp dot
              sitting exactly on the break-even line, with the insight labelled above. */}
          {breakeven ? (
            <ReferenceDot
              x={breakeven.years}
              y={0}
              r={chartTheme.marker.haloRadius}
              fill={chartTheme.scenario.median}
              fillOpacity={chartTheme.marker.haloOpacity}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ) : null}
          {breakeven ? (
            <ReferenceDot
              x={breakeven.years}
              y={0}
              r={5}
              fill={chartTheme.scenario.median}
              stroke="var(--white)"
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: breakeven.label,
                position: "top",
                fill: chartTheme.annotation,
                fontFamily: chartTheme.axis.fontFamily,
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
