"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
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
import type { BenchmarkPoint } from "@/app/[locale]/charts-demo/scenario-data"

/**
 * BenchmarkLinesChart (DESIGN §12 "Scenario & comparison" — benchmark comparison). Your
 * mix's expected path vs a plain 60/40 reference mix, both drawn forward with the SAME
 * projection engine — so neither is a track record, both are an "expected path". Your line
 * leans more into stocks, so it runs a little higher; the shaded gap between them is the
 * honest "am I ahead of just buying a plain 60/40?" — and it widens with time as the small
 * edge compounds. (More expected growth here comes with more risk — see the rough-year and
 * rolling-return cards.) Honest by construction: the Y axis starts at 0, both lines are
 * clearly labelled projections, never a promise. Never colour-alone (§11): each line is
 * directly labelled + ▲ in the tooltip. Fully prop-driven; colours from the chart-theme.
 */

export type BenchmarkLinesLabels = {
  /** your mix's expected-path line */
  you: string
  /** the 60/40 reference line */
  reference: string
  /** the tooltip row for the gap between them */
  gap: string
}

export type BenchmarkLinesChartProps = {
  data: BenchmarkPoint[]
  /** the "+CHF X ahead" callout at the end of your line */
  end?: { year: number; you: number; label: string }
  labels: BenchmarkLinesLabels
  /** formats a franc value for the tooltip (full, locale-aware) */
  formatValue: (value: number) => string
  /** formats a franc value for the Y axis ticks (compact, e.g. "CHF 100K") */
  formatAxisValue: (value: number) => string
  /** formats the tooltip title from a year (e.g. "In 2056") */
  formatYear: (year: number) => string
  ariaLabel: string
}

type BenchmarkDatum = BenchmarkPoint & { gapBand: [number, number] }

type BenchmarkTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: BenchmarkDatum }>
  labels: BenchmarkLinesLabels
  formatValue: (value: number) => string
  formatYear: (year: number) => string
}

/** Plain-language tooltip: your expected balance, the 60/40's, and the gap (▲). */
function BenchmarkTooltip({
  active,
  payload,
  labels,
  formatValue,
  formatYear,
}: BenchmarkTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={formatYear(d.year)}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.you} shape="line" />}
        label={labels.you}
        value={formatValue(d.you)}
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.scenario.reference} shape="line" />}
        label={labels.reference}
        value={formatValue(d.reference)}
      />
      <ChartTooltipRow
        label={labels.gap}
        value={formatValue(d.gap)}
        dir="▲"
        dirClassName="text-pos"
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

export function BenchmarkLinesChart({
  data,
  end,
  labels,
  formatValue,
  formatAxisValue,
  formatYear,
  ariaLabel,
}: BenchmarkLinesChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const gapGradientId = React.useId()

  // The advantage band is drawn from a [reference, you] tuple (your line is always the
  // higher of the two), so the fill shades exactly the space between the paths.
  const rows: BenchmarkDatum[] = React.useMemo(
    () => data.map((d) => ({ ...d, gapBand: [d.reference, d.you] })),
    [data]
  )

  // Honest scale: start at 0 and round the top up to a clean step, so a line's height is
  // its true franc value — never truncate or zoom to exaggerate the lead.
  const yMax = React.useMemo(() => {
    const peak = Math.max(...data.map((d) => d.you))
    return Math.ceil((peak * 1.08) / 1000) * 1000
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
            {/* A faint green wash for the "you're ahead" gap between the two paths. */}
            <ChartGradient id={gapGradientId} stops={chartTheme.gradients.benchGap} />
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
              <BenchmarkTooltip
                labels={labels}
                formatValue={formatValue}
                formatYear={formatYear}
              />
            }
          />

          {/* The advantage band — the space your expected path runs above the 60/40. */}
          <Area
            type="monotone"
            dataKey="gapBand"
            stroke="none"
            fill={`url(#${gapGradientId})`}
            fillOpacity={1}
            isAnimationActive={animate}
            animationDuration={duration}
            activeDot={false}
          />

          {/* The 60/40 reference — a muted dashed "expected path" (the thing to beat). */}
          <Line
            type="monotone"
            dataKey="reference"
            stroke={chartTheme.scenario.reference}
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            dot={false}
            activeDot={{
              r: 4,
              fill: chartTheme.scenario.reference,
              stroke: "var(--white)",
              strokeWidth: 2,
            }}
            isAnimationActive={animate}
            animationDuration={duration}
          />
          {/* A soft glow beneath your line so it lifts off the fill (decorative depth). */}
          <Line
            type="monotone"
            dataKey="you"
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
          {/* Your mix's expected path — the hero line. */}
          <Line
            type="monotone"
            dataKey="you"
            stroke={chartTheme.scenario.you}
            strokeWidth={chartTheme.line.width}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            dot={false}
            activeDot={{
              r: 4,
              fill: chartTheme.scenario.you,
              stroke: "var(--white)",
              strokeWidth: 2,
            }}
            isAnimationActive={animate}
            animationDuration={duration}
          />

          {/* The "+CHF X ahead" callout at the end of your line — a halo + crisp dot. */}
          {end ? (
            <ReferenceDot
              x={end.year}
              y={end.you}
              r={chartTheme.marker.haloRadius}
              fill={chartTheme.scenario.you}
              fillOpacity={chartTheme.marker.haloOpacity}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ) : null}
          {end ? (
            <ReferenceDot
              x={end.year}
              y={end.you}
              r={5}
              fill={chartTheme.scenario.you}
              stroke="var(--white)"
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: end.label,
                position: "left",
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
