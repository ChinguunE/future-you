"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
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
 * DrawdownChart (DESIGN §12 "Your risk" — the underwater plot / "stomach test").
 * The honest downside companion to the growth fan: where the fan shows the range
 * of futures (upside), this shows how far the path falls from its own most-recent
 * high along the way. Each point is a drawdown — `value / runningPeak - 1`, so it
 * is 0 at a new high and dips below a 0 "water line" during declines, climbing back
 * to 0 on recovery. Loss is never colour-alone: it is read by POSITION (below the
 * line) + a ▼ glyph + words; the soft `--neg` gradient only reinforces. The Y axis
 * is honest — 0% pinned at the top, extended only just past the true worst dip, so
 * a shallow fall is never zoomed to look catastrophic.
 *
 * Fully prop-driven — every word comes from the caller (i18n lives in the page),
 * every colour from the chart-theme.
 */

export type DrawdownPoint = {
  /** fractional calendar year (the x value): startYear + monthIndex / 12 */
  t: number
  /** whole calendar year (for the tooltip) */
  year: number
  /** the invested value at this month */
  value: number
  /** the highest value reached so far — the running peak */
  peak: number
  /** drawdown as a fraction of the peak: value / peak - 1 (always <= 0) */
  drawdown: number
}

export type DrawdownLabels = {
  /** tooltip row — how far below the recent peak */
  below: string
  /** tooltip row — the value at this point */
  value: string
  /** tooltip row — the recent peak it is measured from */
  peak: string
}

export type DrawdownChartProps = {
  data: DrawdownPoint[]
  /** the deepest fall — a marked dot + its already-formatted pill label */
  trough: { t: number; drawdown: number; label: string }
  /** the underwater episode (peak → recovery) softly shaded to draw the eye */
  episode?: { startT: number; endT: number }
  /** an optional note on the 0 water line (e.g. "0% = back at a new high") */
  waterlineLabel?: string
  labels: DrawdownLabels
  /** formats a franc value for the tooltip (full, locale-aware; from the caller) */
  formatValue: (value: number) => string
  /** formats a drawdown fraction as a percent (e.g. -0.22 → "−22%") */
  formatPercent: (value: number) => string
  /** formats the tooltip title from a year (e.g. "In 2041") */
  formatYear: (year: number) => string
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

type DrawdownTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: DrawdownPoint }>
  labels: DrawdownLabels
  formatValue: (value: number) => string
  formatPercent: (value: number) => string
  formatYear: (year: number) => string
}

/** Plain-language tooltip: how far below the peak (▼), plus the value vs its peak. */
function DrawdownTooltip({
  active,
  payload,
  labels,
  formatValue,
  formatPercent,
  formatYear,
}: DrawdownTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <ChartTooltipCard title={formatYear(d.year)}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.neg} shape="line" />}
        label={labels.below}
        value={formatPercent(d.drawdown)}
        dir={d.drawdown < 0 ? "▼" : undefined}
        dirClassName="text-neg"
      />
      <ChartTooltipRow label={labels.value} value={formatValue(d.value)} />
      <ChartTooltipRow label={labels.peak} value={formatValue(d.peak)} />
    </ChartTooltipCard>
  )
}

type TroughViewBox = { x?: number; y?: number; width?: number; height?: number }

/**
 * The floating "worst dip" pill above the trough dot (the beauty-bar signature,
 * borrowed from premium dashboards and re-skinned to our tokens). A white rounded
 * pill ringed in `--neg` with bold `--neg` text; the trough is deep, so the pill
 * sits above the dot (toward the water line) and stays inside the plot. Decorative
 * (pointer-events off) — the accessible number lives in the tooltip + table + maths.
 */
function TroughPill({
  viewBox,
  text,
}: {
  viewBox?: TroughViewBox
  text: string
}) {
  if (!viewBox || viewBox.x == null || viewBox.y == null) return null
  const cx = viewBox.x + (viewBox.width ?? 0) / 2
  const cy = viewBox.y + (viewBox.height ?? 0) / 2
  const h = 22
  const w = Math.round(text.length * 6.6 + 18)
  const gap = 12
  const rectY = cy - gap - h
  return (
    <g pointerEvents="none">
      <rect
        x={cx - w / 2}
        y={rectY}
        width={w}
        height={h}
        rx={h / 2}
        fill="var(--white)"
        stroke={chartTheme.neg}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={rectY + h / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={chartTheme.neg}
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

export function DrawdownChart({
  data,
  trough,
  episode,
  waterlineLabel,
  labels,
  formatValue,
  formatPercent,
  formatYear,
  ariaLabel,
}: DrawdownChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const gradientId = React.useId()

  const firstYear = data[0].year
  const lastYear = data[data.length - 1].year

  // Whole-year ticks across the horizon (the monthly series is smooth, but the
  // axis reads in calendar years). Always keep the last year so the axis closes.
  const ticks = React.useMemo(() => {
    const span = lastYear - firstYear
    const step = span <= 6 ? 1 : span <= 16 ? 3 : 5
    const out: number[] = []
    for (let y = firstYear; y < lastYear; y += step) out.push(y)
    out.push(lastYear)
    return out
  }, [firstYear, lastYear])

  // Honest floor + evenly-spaced ticks: 0% stays pinned at the top; the bottom
  // extends only just past the true worst dip, rounded to a clean step (5% when
  // the fall is shallow, else 10%). Explicit ticks avoid Recharts' uneven
  // auto-ticks on a negative domain — and the axis is never zoomed to exaggerate.
  const { yMin, yTicks } = React.useMemo(() => {
    const worst = Math.min(...data.map((d) => d.drawdown))
    const step = worst - 0.02 > -0.2 ? 0.05 : 0.1
    const floor = Math.floor((worst - 0.02) / step) * step
    const ticks: number[] = []
    for (let v = floor; v <= 1e-9; v += step) {
      const r = Math.round(v * 1000) / 1000
      ticks.push(r === 0 ? 0 : r) // normalise -0 → 0 (avoids a "-0%" tick)
    }
    return { yMin: floor, yTicks: ticks }
  }, [data])

  return (
    // font-variant-numeric inherits into the SVG so axis percents are tabular
    // (.nums). role="group" + a name names the region without hiding the keyboard
    // data layer the way role="img" would.
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
            {/* Deeper = more saturated: the fill fades from near-nothing at the
                water line to a soft --neg blush at the bottom (calm, not alarm). */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartTheme.neg} stopOpacity={0.04} />
              <stop offset="100%" stopColor={chartTheme.neg} stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            dataKey="t"
            type="number"
            domain={[firstYear, lastYear]}
            ticks={ticks}
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={10}
            tickFormatter={(v: number) => String(Math.round(v))}
          />
          <YAxis
            domain={[yMin, 0]}
            ticks={yTicks}
            width={56}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatPercent(v)}
          />
          <Tooltip
            cursor={{
              stroke: chartTheme.cursor.stroke,
              strokeDasharray: chartTheme.cursor.dash,
            }}
            content={
              <DrawdownTooltip
                labels={labels}
                formatValue={formatValue}
                formatPercent={formatPercent}
                formatYear={formatYear}
              />
            }
          />

          {/* The worst underwater stretch — a faint band from the peak to recovery. */}
          {episode ? (
            <ReferenceArea
              x1={episode.startT}
              x2={episode.endT}
              y1={yMin}
              y2={0}
              fill={chartTheme.neg}
              fillOpacity={0.05}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ) : null}

          {/* The 0 water line — being at (or back to) a new high. */}
          <ReferenceLine
            y={0}
            stroke={chartTheme.axis.stroke}
            strokeWidth={1.5}
            label={
              waterlineLabel
                ? {
                    value: waterlineLabel,
                    position: "insideTopRight",
                    fill: chartTheme.axis.tick,
                    fontFamily: chartTheme.axis.fontFamily,
                    fontSize: 12,
                    fontWeight: 700,
                  }
                : undefined
            }
          />

          {/* The drawdown itself — a soft area hanging below the water line. */}
          <Area
            type="monotone"
            dataKey="drawdown"
            baseValue={0}
            stroke={chartTheme.neg}
            strokeWidth={2}
            strokeLinecap={chartTheme.line.cap}
            strokeLinejoin={chartTheme.line.join}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: chartTheme.neg,
              stroke: "var(--white)",
              strokeWidth: 2,
            }}
            isAnimationActive={animate}
            animationDuration={duration}
          />

          {/* The deepest fall, marked + labelled with a floating pill. */}
          <ReferenceDot
            x={trough.t}
            y={trough.drawdown}
            r={5}
            fill={chartTheme.neg}
            stroke="var(--white)"
            strokeWidth={2}
            ifOverflow="extendDomain"
            label={(props: { viewBox?: TroughViewBox }) => (
              <TroughPill viewBox={props.viewBox} text={trough.label} />
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
