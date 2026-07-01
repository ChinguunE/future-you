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
import type { RiskContributionDatum } from "@/app/[locale]/charts-demo/risk-data"

/**
 * RiskContributionChart (DESIGN §12 "Your risk"). Each holding's share of your MONEY
 * next to its share of your RISK, ranked by risk so the biggest driver leads. Where the
 * two bars diverge is the point: a small high-beta position can carry far more risk than
 * its money share (weight ≠ risk). Honest by construction — the value axis starts at a
 * true 0, both series are named in the legend (never colour-alone), and the "punches
 * above its weight" ratio is a glyph + words in the tooltip (§11). Colours from tokens.
 */

export type RiskContributionLabels = {
  weight: string
  risk: string
  /** e.g. "× its money share" — appended to the ratio in the tooltip */
  ratioSuffix: string
  /** e.g. "carries more risk than money" (ratio > 1) */
  aboveWeight: string
  /** e.g. "carries less risk than money" (ratio < 1) */
  belowWeight: string
}

export type RiskContributionChartProps = {
  data: RiskContributionDatum[]
  labels: RiskContributionLabels
  /** formats a 0..1 share as a percent (locale-aware) */
  formatShare: (value: number) => string
  /** formats the ratio, e.g. "3.7×" (locale-aware) */
  formatRatio: (value: number) => string
  ariaLabel: string
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

type RiskTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: RiskContributionDatum }>
  labels: RiskContributionLabels
  formatShare: (value: number) => string
  formatRatio: (value: number) => string
}

function RiskTooltip({
  active,
  payload,
  labels,
  formatShare,
  formatRatio,
}: RiskTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  const above = d.ratio > 1.05
  const below = d.ratio < 0.95
  const dirClass = above ? "text-neg" : below ? "text-pos" : "text-text-muted"
  const glyph = above ? "▲" : below ? "▼" : "→"
  const word = above ? labels.aboveWeight : below ? labels.belowWeight : ""
  return (
    <ChartTooltipCard title={d.name}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.series[3]} shape="band" />}
        label={labels.weight}
        value={formatShare(d.weight)}
      />
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.series[0]} shape="band" />}
        label={labels.risk}
        value={formatShare(d.risk)}
      />
      <ChartTooltipRow
        label={word}
        value={`${formatRatio(d.ratio)} ${labels.ratioSuffix}`}
        dir={glyph}
        dirClassName={dirClass}
      />
    </ChartTooltipCard>
  )
}

export function RiskContributionChart({
  data,
  labels,
  formatShare,
  formatRatio,
  ariaLabel,
}: RiskContributionChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const weightId = React.useId()
  const riskId = React.useId()

  // Honest value axis: start at 0, round the top up to a clean 10% mark so a bar's
  // length is its true share and nothing is truncated to exaggerate the divergence.
  const xMax = React.useMemo(() => {
    const peak = Math.max(...data.flatMap((d) => [d.weight, d.risk]), 0)
    return Math.ceil((peak + 0.001) * 10) / 10
  }, [data])

  return (
    <div className="nums h-[380px] w-full" role="group" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
          barCategoryGap="22%"
          accessibilityLayer
        >
          <defs>
            {/* Glossy sheens matching the mix bars — sky for money, green for risk. */}
            <ChartGradient id={weightId} stops={chartTheme.gradients.wedgeBond} />
            <ChartGradient id={riskId} stops={chartTheme.gradients.wedgeEquity} />
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
              <RiskTooltip
                labels={labels}
                formatShare={formatShare}
                formatRatio={formatRatio}
              />
            }
          />

          <Bar
            dataKey="weight"
            fill={`url(#${weightId})`}
            stroke={chartTheme.series[3]}
            strokeWidth={1}
            radius={[0, chartTheme.bar.radius, chartTheme.bar.radius, 0]}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            <LabelList
              dataKey="weight"
              position="right"
              formatter={(value: React.ReactNode) => formatShare(Number(value))}
              fill={chartTheme.annotation}
              fontFamily={chartTheme.axis.fontFamily}
              fontSize={11}
              fontWeight={700}
            />
          </Bar>
          <Bar
            dataKey="risk"
            fill={`url(#${riskId})`}
            stroke={chartTheme.series[0]}
            strokeWidth={1}
            radius={[0, chartTheme.bar.radius, chartTheme.bar.radius, 0]}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            <LabelList
              dataKey="risk"
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
