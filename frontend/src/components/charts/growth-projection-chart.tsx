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
import {
  ChartTooltipCard,
  ChartTooltipRow,
  TooltipSwatch,
} from "@/components/charts/chart-tooltip"

/**
 * GrowthProjectionChart (DESIGN §12 "Your growth" — the honest projection). Shows
 * a range of futures, NOT one false line: the shaded p10-p90 band (a good-vs-rough
 * run) with the median "most likely" line on top, plus a "your goal" rule and a
 * "you are here" dot. The Y axis always starts at 0 and stretches to include the
 * goal, so the scale is never truncated or zoomed to flatter the outcome (accuracy
 * is sacred). Fully prop-driven — all words come from the caller (i18n lives in the
 * page), all colours from the chart-theme.
 */

export type ProjectionPoint = {
  /** calendar year (the x value) */
  year: number
  /** a rough run — the 10th percentile */
  p10: number
  /** the most likely outcome — the median */
  median: number
  /** a good run — the 90th percentile */
  p90: number
}

export type GrowthProjectionLabels = {
  /** row label for the median line */
  likely: string
  /** row label for the upper (p90) edge */
  good: string
  /** row label for the lower (p10) edge */
  rough: string
}

export type GrowthProjectionChartProps = {
  data: ProjectionPoint[]
  /** "your goal" horizontal rule + its on-chart label */
  goal?: { value: number; label: string }
  /** "you are here" dot + its on-chart label */
  here?: { year: number; value: number; label: string }
  labels: GrowthProjectionLabels
  /** formats a franc value for the tooltip (full, locale-aware; from the caller) */
  formatValue: (value: number) => string
  /** formats a franc value for the Y axis ticks (compact, e.g. "CHF 60K") */
  formatAxisValue: (value: number) => string
  /** formats the tooltip title from a year (e.g. "In 2041") */
  formatYear: (year: number) => string
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

type ProjectionDatum = ProjectionPoint & { band: [number, number] }

type ProjectionTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: ProjectionDatum }>
  labels: GrowthProjectionLabels
  formatValue: (value: number) => string
  formatYear: (year: number) => string
}

/** Plain-language tooltip: most likely, a good run (▲), a rough run (▼). */
function ProjectionTooltip({
  active,
  payload,
  labels,
  formatValue,
  formatYear,
}: ProjectionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={formatYear(d.year)}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.median} shape="line" />}
        label={labels.likely}
        value={formatValue(d.median)}
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.band} shape="band" />}
        label={labels.good}
        value={formatValue(d.p90)}
        dir="▲"
        dirClassName="text-pos"
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.band} shape="band" />}
        label={labels.rough}
        value={formatValue(d.p10)}
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

export function GrowthProjectionChart({
  data,
  goal,
  here,
  labels,
  formatValue,
  formatAxisValue,
  formatYear,
  ariaLabel,
}: GrowthProjectionChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration

  // The band is drawn from a [low, high] tuple per point (Recharts range area).
  const rows: ProjectionDatum[] = React.useMemo(
    () => data.map((d) => ({ ...d, band: [d.p10, d.p90] })),
    [data]
  )

  // Honest scale: start at 0, and stretch the top to include the goal so the goal
  // rule is always visible — never crop the axis to exaggerate the climb.
  const yMax = React.useMemo(() => {
    const peak = Math.max(...data.map((d) => d.p90), goal?.value ?? 0)
    return Math.ceil((peak * 1.1) / 1000) * 1000
  }, [data, goal])

  return (
    // font-variant-numeric inherits into the SVG text, so axis numbers are tabular
    // (.nums). role="group" + a name gives the region context without hiding the
    // keyboard data layer (Recharts accessibilityLayer) the way role="img" would.
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
              <ProjectionTooltip
                labels={labels}
                formatValue={formatValue}
                formatYear={formatYear}
              />
            }
          />

          {/* The p10-p90 fan — a range of futures, not a false single line. */}
          <Area
            type="monotone"
            dataKey="band"
            stroke={chartTheme.bandStroke}
            strokeWidth={1}
            fill={chartTheme.band}
            fillOpacity={chartTheme.bandOpacity}
            isAnimationActive={animate}
            animationDuration={duration}
            activeDot={false}
          />
          {/* The most likely outcome. */}
          <Line
            type="monotone"
            dataKey="median"
            stroke={chartTheme.median}
            strokeWidth={chartTheme.line.width}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            dot={false}
            isAnimationActive={animate}
            animationDuration={duration}
          />

          {goal ? (
            <ReferenceLine
              y={goal.value}
              stroke={chartTheme.goal}
              strokeWidth={2}
              strokeDasharray="6 5"
              ifOverflow="extendDomain"
              label={{
                value: goal.label,
                position: "insideTopRight",
                fill: chartTheme.annotation,
                fontFamily: chartTheme.axis.fontFamily,
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          ) : null}

          {here ? (
            <ReferenceDot
              x={here.year}
              y={here.value}
              r={5}
              fill={chartTheme.here}
              stroke="var(--white)"
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: here.label,
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
