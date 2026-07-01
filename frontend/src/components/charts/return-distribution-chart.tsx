"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Bar,
  BarChart,
  Cell,
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
import type { ReturnBin } from "@/app/[locale]/charts-demo/risk-data"

/**
 * ReturnDistributionChart (DESIGN §12 "Your risk"). The range of a typical YEAR's
 * return over the holding period, drawn as a histogram: calm green bars for the bulk
 * of years, and the WORST 5% shaded --neg so the downside is unmissable. Two dashed
 * rules mark the honest tail numbers — VaR (the 1-in-20 bad year) and CVaR (the
 * AVERAGE of that worst 5%). Honest by construction: the bars are a real probability
 * distribution (they sum to ~1), the value axis starts at 0, and the tail carries a
 * ▼ glyph + a label, never colour alone (§11). Fully prop-driven; colours from tokens.
 */

export type ReturnDistributionLabels = {
  /** tooltip row: the chance of landing in this return range */
  chance: string
  /** tooltip row for the bulk bars */
  typical: string
  /** tooltip row for the tail bars */
  worst: string
}

export type ReturnDistributionChartProps = {
  bins: ReturnBin[]
  /** VaR₉₅ rule + label (a fraction ≤ 0 usually) */
  var: { value: number; label: string }
  /** CVaR₉₅ rule + label */
  cvar: { value: number; label: string }
  labels: ReturnDistributionLabels
  /** formats a 0..1 return fraction as a percent (locale-aware, signed) */
  formatReturn: (value: number) => string
  /** formats a 0..1 probability mass as a percent (locale-aware) */
  formatChance: (value: number) => string
  ariaLabel: string
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

type DistTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: ReturnBin }>
  labels: ReturnDistributionLabels
  formatReturn: (value: number) => string
  formatChance: (value: number) => string
  binWidth: number
}

/** Plain-language tooltip: the return range for this bar + how likely it is. */
function DistTooltip({
  active,
  payload,
  labels,
  formatReturn,
  formatChance,
  binWidth,
}: DistTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  const lo = d.mid - binWidth / 2
  const hi = d.mid + binWidth / 2
  const color = d.isTail ? chartTheme.neg : chartTheme.series[0]
  return (
    <ChartTooltipCard title={`${formatReturn(lo)} … ${formatReturn(hi)}`}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={color} shape="band" />}
        label={d.isTail ? labels.worst : labels.typical}
        value={formatChance(d.mass)}
        dir={d.isTail ? "▼" : undefined}
        dirClassName={d.isTail ? "text-neg" : undefined}
      />
      <ChartTooltipRow label={labels.chance} value={formatChance(d.mass)} />
    </ChartTooltipCard>
  )
}

export function ReturnDistributionChart({
  bins,
  var: varMark,
  cvar,
  labels,
  formatReturn,
  formatChance,
  ariaLabel,
}: ReturnDistributionChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const bodyId = React.useId()
  const tailId = React.useId()

  const binWidth = bins.length > 1 ? bins[1].mid - bins[0].mid : 0.01

  // Honest domain: a symmetric window around the mean, padded half a bin so the edge
  // bars aren't clipped. The value (probability) axis starts at a true 0.
  const [lo, hi] = React.useMemo(() => {
    const mids = bins.map((b) => b.mid)
    return [Math.min(...mids) - binWidth / 2, Math.max(...mids) + binWidth / 2]
  }, [bins, binWidth])

  return (
    <div
      className="nums h-[360px] w-full sm:h-[340px]"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bins}
          margin={{ top: 24, right: 16, bottom: 4, left: 4 }}
          barCategoryGap={0}
          barGap={0}
          accessibilityLayer
        >
          <defs>
            {/* Glossy sheens: green for the bulk of years, --neg for the worst 5%. */}
            <ChartGradient id={bodyId} stops={chartTheme.gradients.wedgeEquity} />
            <ChartGradient id={tailId} stops={chartTheme.gradients.histTail} />
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            type="number"
            dataKey="mid"
            domain={[lo, hi]}
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={10}
            tickCount={7}
            tickFormatter={(v: number) => formatReturn(v)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            width={52}
            tickFormatter={(v: number) => formatChance(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            content={
              <DistTooltip
                labels={labels}
                formatReturn={formatReturn}
                formatChance={formatChance}
                binWidth={binWidth}
              />
            }
          />

          <Bar
            dataKey="mass"
            radius={[chartTheme.bar.radius, chartTheme.bar.radius, 0, 0]}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            {bins.map((b, i) => (
              <Cell
                key={i}
                fill={b.isTail ? `url(#${tailId})` : `url(#${bodyId})`}
                stroke={b.isTail ? chartTheme.neg : chartTheme.series[0]}
                strokeWidth={0.75}
              />
            ))}
          </Bar>

          {/* The 1-in-20 bad year (VaR) — a dashed ink rule with a top label. */}
          <ReferenceLine
            x={varMark.value}
            stroke={chartTheme.annotation}
            strokeWidth={2}
            strokeDasharray="6 5"
            ifOverflow="extendDomain"
            label={{
              value: varMark.label,
              position: "insideTopLeft",
              fill: chartTheme.annotation,
              fontFamily: chartTheme.axis.fontFamily,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
          {/* The average of that worst 5% (CVaR) — a dotted --neg rule, further left. Its
              on-chart text is omitted (it would sit atop the tail bars at the baseline);
              the legend names the dotted rule and the KPI carries the number. */}
          <ReferenceLine
            x={cvar.value}
            stroke={chartTheme.neg}
            strokeWidth={2}
            strokeDasharray="2 4"
            ifOverflow="extendDomain"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
