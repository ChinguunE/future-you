"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  CartesianGrid,
  LabelList,
  ReferenceDot,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"

import { chartTheme } from "@/lib/chart-theme"
import {
  ChartTooltipCard,
  ChartTooltipRow,
  TooltipSwatch,
} from "@/components/charts/chart-tooltip"
import type {
  FrontierAsset,
  FrontierPoint,
} from "@/app/[locale]/charts-demo/risk-data"

/**
 * EfficientFrontierChart (DESIGN §12 "Your risk"). Risk across, expected return up: the
 * frontier curve is the best return you can hope for at each level of risk. The OPTIMAL
 * mix sits on it at the best return-per-risk; "you are here" marks your tilted mix a
 * little further along, where each extra unit of risk pays less. Faint dots mark single
 * holdings — riskier on their own than the diversified frontier. Honest by construction:
 * BOTH axes start at a true 0 (a point's position is its real risk + return), and every
 * marker is a shape + a label, never colour alone (§11). Prop-driven; colours from tokens.
 */

export type EfficientFrontierLabels = {
  /** on-chart label for the optimal marker */
  optimal: string
  /** on-chart label for the "you are here" marker */
  you: string
  /** tooltip rows */
  riskRow: string
  returnRow: string
  /** the axis titles */
  riskAxis: string
  returnAxis: string
}

export type EfficientFrontierChartProps = {
  curve: FrontierPoint[]
  optimal: FrontierPoint
  you: FrontierPoint
  assets: FrontierAsset[]
  labels: EfficientFrontierLabels
  /** formats a 0..1 fraction as a percent (locale-aware, 1 decimal) */
  formatPct: (value: number) => string
  ariaLabel: string
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

const AXIS_TITLE = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: 12,
  fontWeight: 700,
} as const

type AssetTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: FrontierAsset }>
  labels: EfficientFrontierLabels
  formatPct: (value: number) => string
}

/** Plain-language tooltip for a single holding's risk + return. */
function AssetTooltip({ active, payload, labels, formatPct }: AssetTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d || d.name == null) return null
  return (
    <ChartTooltipCard title={d.name}>
      <ChartTooltipRow
        swatch={<TooltipSwatch color={chartTheme.frontier.asset} shape="dot" />}
        label={labels.returnRow}
        value={formatPct(d.return)}
      />
      <ChartTooltipRow label={labels.riskRow} value={formatPct(d.risk)} />
    </ChartTooltipCard>
  )
}

/** A faint hollow dot for a single holding (kept quiet so the frontier + you lead). */
function AssetDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props
  if (cx == null || cy == null) return <g />
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--white)"
      stroke={chartTheme.frontier.asset}
      strokeWidth={1.5}
    />
  )
}

export function EfficientFrontierChart({
  curve,
  optimal,
  you,
  assets,
  labels,
  formatPct,
  ariaLabel,
}: EfficientFrontierChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration

  // Honest domains: both axes start at 0, padded a touch at the top so the riskiest
  // dot + the highest return aren't clipped. A point's (x, y) is its true (risk, return).
  const xMax = React.useMemo(() => {
    const peak = Math.max(...assets.map((a) => a.risk), you.risk, ...curve.map((c) => c.risk))
    return Math.ceil((peak * 1.05) * 100) / 100
  }, [assets, you, curve])
  const yMax = React.useMemo(() => {
    const peak = Math.max(...assets.map((a) => a.return), ...curve.map((c) => c.return))
    return Math.ceil((peak * 1.12) * 100) / 100
  }, [assets, curve])

  return (
    <div
      className="nums h-[380px] w-full sm:h-[360px]"
      role="group"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 24, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          <XAxis
            type="number"
            dataKey="risk"
            domain={[0, xMax]}
            tickLine={false}
            axisLine={{ stroke: chartTheme.axis.stroke }}
            tick={AXIS_TICK}
            tickMargin={8}
            tickFormatter={(v: number) => formatPct(v)}
            label={{
              value: labels.riskAxis,
              position: "insideBottom",
              offset: -14,
              ...AXIS_TITLE,
            }}
          />
          <YAxis
            type="number"
            dataKey="return"
            domain={[0, yMax]}
            width={56}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatPct(v)}
            label={{
              value: labels.returnAxis,
              angle: -90,
              position: "insideLeft",
              offset: 16,
              style: { textAnchor: "middle" },
              ...AXIS_TITLE,
            }}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{
              stroke: chartTheme.cursor.stroke,
              strokeDasharray: chartTheme.cursor.dash,
            }}
            content={
              <AssetTooltip labels={labels} formatPct={formatPct} />
            }
          />

          {/* The efficient-frontier curve — a Scatter drawn as a connected line only. */}
          <Scatter
            data={curve}
            line={{ stroke: chartTheme.frontier.curve, strokeWidth: chartTheme.line.width }}
            lineJointType="monotoneX"
            shape={() => <g />}
            isAnimationActive={animate}
            animationDuration={duration}
          />
          {/* Single holdings — faint context dots with a small ticker label. */}
          <Scatter
            data={assets}
            shape={<AssetDot />}
            isAnimationActive={animate}
            animationDuration={duration}
          >
            <LabelList
              dataKey="ticker"
              position="top"
              offset={8}
              fill={chartTheme.axis.tick}
              fontFamily={chartTheme.axis.fontFamily}
              fontSize={10}
              fontWeight={600}
            />
          </Scatter>

          {/* A soft halo beneath the optimal marker, then the crisp labelled dot. */}
          <ReferenceDot
            x={optimal.risk}
            y={optimal.return}
            r={chartTheme.marker.haloRadius}
            fill={chartTheme.frontier.optimal}
            fillOpacity={chartTheme.marker.haloOpacity}
            stroke="none"
          />
          <ReferenceDot
            x={optimal.risk}
            y={optimal.return}
            r={6}
            fill={chartTheme.frontier.optimal}
            stroke="var(--white)"
            strokeWidth={2}
            label={{
              value: labels.optimal,
              position: "right",
              fill: chartTheme.annotation,
              fontFamily: chartTheme.axis.fontFamily,
              fontSize: 12,
              fontWeight: 700,
            }}
          />

          {/* "You are here" — a halo, then the crisp ink dot with its label. */}
          <ReferenceDot
            x={you.risk}
            y={you.return}
            r={chartTheme.marker.haloRadius}
            fill={chartTheme.frontier.you}
            fillOpacity={chartTheme.marker.haloOpacity}
            stroke="none"
          />
          <ReferenceDot
            x={you.risk}
            y={you.return}
            r={6}
            fill={chartTheme.frontier.you}
            stroke="var(--white)"
            strokeWidth={2}
            label={{
              value: labels.you,
              position: "top",
              fill: chartTheme.annotation,
              fontFamily: chartTheme.axis.fontFamily,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
