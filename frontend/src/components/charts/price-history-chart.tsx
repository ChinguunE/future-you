"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
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
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

/**
 * PriceHistoryChart (DESIGN §12 "Your stocks") — a single holding's price over time,
 * in two views:
 *   - the default LINE/area view: the close price as a calm --green-700 line over a
 *     glossy fade, honest about the past (one real series, always tabled);
 *   - an "advanced" CANDLESTICK view: one candle per session, drawn by a custom Recharts
 *     bar shape (no new dependency). A rising session (close ≥ open) fills brand green, a
 *     falling one fills --neg — but direction is never colour-alone: the body sits
 *     open→close, the wick shows the day's range, and the tooltip spells out O/H/L/C.
 *
 * The TIME RANGE (1M … Max) lives in the ChartCard's control slot (the parent owns it
 * and refilters the data); the line/candles toggle is this chart's own small control.
 * Fully prop-driven — every word comes from the caller (i18n lives in the page).
 */

export type PriceHistoryDatum = {
  /** the session date as a UTC millisecond stamp (the x value) */
  date: number
  open: number
  high: number
  low: number
  close: number
}

export type PriceHistoryMode = "line" | "candles"

export type PriceHistoryLabels = {
  /** tooltip rows */
  open: string
  high: string
  low: string
  close: string
}

export type PriceHistoryChartProps = {
  /** the daily closes in the window (drawn in line mode) */
  points: PriceHistoryDatum[]
  /** the window bucketed into legible candles (drawn in candle mode) */
  candles: PriceHistoryDatum[]
  mode: PriceHistoryMode
  onModeChange: (mode: PriceHistoryMode) => void
  /** the line/candles toggle labels */
  modeLabels: { label: string; line: string; candles: string }
  labels: PriceHistoryLabels
  /** formats a price for the tooltip (full, e.g. "$172.40") */
  formatPrice: (value: number) => string
  /** formats a price for the Y axis ticks (e.g. "$180") */
  formatAxisPrice: (value: number) => string
  /** formats a date-stamp for the X axis ticks (e.g. "Mar 2024") */
  formatAxisDate: (ms: number) => string
  /** formats a date-stamp for the tooltip title (e.g. "12 Mar 2024") */
  formatTipDate: (ms: number) => string
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

const AXIS_TICK = {
  fill: chartTheme.axis.tick,
  fontFamily: chartTheme.axis.fontFamily,
  fontSize: chartTheme.axis.fontSize,
  fontWeight: chartTheme.axis.fontWeight,
} as const

type CandleDatum = PriceHistoryDatum & { hl: [number, number] }

type PriceTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: PriceHistoryDatum }>
  mode: PriceHistoryMode
  labels: PriceHistoryLabels
  formatPrice: (value: number) => string
  formatTipDate: (ms: number) => string
}

/** Plain-language tooltip: the close in line mode, the full O/H/L/C in candle mode. */
function PriceTooltip({
  active,
  payload,
  mode,
  labels,
  formatPrice,
  formatTipDate,
}: PriceTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  if (mode === "line") {
    return (
      <ChartTooltipCard title={formatTipDate(d.date)}>
        <ChartTooltipRow
          swatch={<TooltipSwatch color={chartTheme.price.line} shape="line" />}
          label={labels.close}
          value={formatPrice(d.close)}
        />
      </ChartTooltipCard>
    )
  }
  const up = d.close >= d.open
  return (
    <ChartTooltipCard title={formatTipDate(d.date)}>
      <ChartTooltipRow label={labels.open} value={formatPrice(d.open)} />
      <ChartTooltipRow label={labels.high} value={formatPrice(d.high)} />
      <ChartTooltipRow label={labels.low} value={formatPrice(d.low)} />
      <ChartTooltipRow
        swatch={
          <TooltipSwatch
            color={up ? chartTheme.candle.up : chartTheme.candle.down}
            shape="band"
          />
        }
        label={labels.close}
        value={formatPrice(d.close)}
        dir={up ? "▲" : "▼"}
        dirClassName={up ? "text-pos" : "text-neg"}
      />
    </ChartTooltipCard>
  )
}

type CandleShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: PriceHistoryDatum
}

/**
 * One candle, drawn from the pixel box Recharts computes for the low→high bar: a thin
 * high–low wick and a rounded open→close body (open/close pixels interpolated inside the
 * box, which is linear in price). Colour-coded up/down but never colour-alone — the body
 * position + the tooltip's O/H/L/C carry the meaning. Decorative (the numbers live in the
 * tooltip + table).
 */
function CandleShape({ x, y, width, height, payload }: CandleShapeProps) {
  if (x == null || y == null || width == null || height == null || !payload) {
    return null
  }
  const { open, high, low, close } = payload
  const up = close >= open
  const color = up ? chartTheme.candle.up : chartTheme.candle.down
  const cx = x + width / 2
  const cw = Math.max(1.5, Math.min(16, width * 0.7))
  const span = high - low
  // y = pixel(high) (box top), y + height = pixel(low). Interpolate any price linearly.
  const py = (v: number) => (span > 0 ? y + ((high - v) / span) * height : y + height / 2)
  const yOpen = py(open)
  const yClose = py(close)
  const top = Math.min(yOpen, yClose)
  const bodyH = Math.max(1.5, Math.abs(yClose - yOpen))
  return (
    <g>
      <line
        x1={cx}
        x2={cx}
        y1={y}
        y2={y + height}
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
      />
      <rect
        data-slot="candle"
        x={cx - cw / 2}
        y={top}
        width={cw}
        height={bodyH}
        rx={chartTheme.candle.radius}
        fill={color}
      />
    </g>
  )
}

export function PriceHistoryChart({
  points,
  candles,
  mode,
  onModeChange,
  modeLabels,
  labels,
  formatPrice,
  formatAxisPrice,
  formatAxisDate,
  formatTipDate,
  ariaLabel,
}: PriceHistoryChartProps) {
  const reduced = useReducedMotion()
  const animate = !reduced
  const duration = reduced ? 0 : chartTheme.animation.duration
  const areaGradientId = React.useId()
  const modeLabelId = React.useId()

  const isLine = mode === "line"

  // Candle mode draws on a category axis (natural for candles) from a low→high bar.
  const candleData: CandleDatum[] = React.useMemo(
    () => candles.map((c) => ({ ...c, hl: [c.low, c.high] })),
    [candles]
  )
  const data = isLine ? points : candleData

  // One honest Y domain from the full window's lows/highs, so toggling line ↔ candles
  // never rescales the axis. Padded a touch so wicks + the latest dot aren't clipped.
  const { yMin, yMax } = React.useMemo(() => {
    const lo = Math.min(...points.map((p) => p.low))
    const hi = Math.max(...points.map((p) => p.high))
    const pad = (hi - lo) * 0.06 || hi * 0.06
    return { yMin: Math.max(0, lo - pad), yMax: hi + pad }
  }, [points])

  // Five evenly-spaced date ticks taken from the line data (always in-domain).
  const lineTicks = React.useMemo(() => {
    const n = points.length
    if (n === 0) return []
    const idx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)))
    return [...new Set(idx)].map((i) => points[i].date)
  }, [points])

  // Show ~6 labels on the category (candle) axis, whatever the bucket count.
  const candleInterval = Math.max(0, Math.ceil(candleData.length / 6) - 1)

  const last = points[points.length - 1]

  return (
    <div
      className="nums relative h-[380px] w-full sm:h-[340px]"
      role="group"
      aria-label={ariaLabel}
    >
      {/* This chart's own control — the line / candlestick "advanced" view. The time
          range lives in the ChartCard's control slot (the parent owns it). */}
      <div className="absolute top-0 right-0 z-10 flex flex-col items-end gap-1">
        <span className="sr-only" id={modeLabelId}>
          {modeLabels.label}
        </span>
        <Segmented
          type="single"
          value={mode}
          onValueChange={(v) => v && onModeChange(v as PriceHistoryMode)}
          aria-labelledby={modeLabelId}
          className="h-9"
        >
          <SegmentedItem value="line" className="h-7 min-w-14 text-xs">
            {modeLabels.line}
          </SegmentedItem>
          <SegmentedItem value="candles" className="h-7 min-w-14 text-xs">
            {modeLabels.candles}
          </SegmentedItem>
        </Segmented>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 44, right: 16, bottom: 4, left: 4 }}
          accessibilityLayer
        >
          <defs>
            <ChartGradient
              id={areaGradientId}
              stops={chartTheme.gradients.priceArea}
            />
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={chartTheme.grid.stroke}
            strokeDasharray={chartTheme.grid.dash}
          />
          {isLine ? (
            <XAxis
              dataKey="date"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={lineTicks}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axis.stroke }}
              tick={AXIS_TICK}
              tickMargin={10}
              tickFormatter={(v: number) => formatAxisDate(v)}
            />
          ) : (
            <XAxis
              dataKey="date"
              type="category"
              interval={candleInterval}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axis.stroke }}
              tick={AXIS_TICK}
              tickMargin={10}
              tickFormatter={(v: number) => formatAxisDate(Number(v))}
            />
          )}
          <YAxis
            domain={[yMin, yMax]}
            width={64}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatAxisPrice(v)}
          />
          <Tooltip
            cursor={
              isLine
                ? {
                    stroke: chartTheme.cursor.stroke,
                    strokeDasharray: chartTheme.cursor.dash,
                  }
                : { fill: "var(--muted)", fillOpacity: 0.5 }
            }
            content={
              <PriceTooltip
                mode={mode}
                labels={labels}
                formatPrice={formatPrice}
                formatTipDate={formatTipDate}
              />
            }
          />

          {isLine ? (
            <>
              {/* The close-price area — a real past series over a glossy fade. */}
              <Area
                type="monotone"
                dataKey="close"
                stroke="none"
                fill={`url(#${areaGradientId})`}
                fillOpacity={1}
                isAnimationActive={animate}
                animationDuration={duration}
                activeDot={false}
              />
              {/* A soft glow beneath the line so it lifts off the fill. */}
              <Line
                type="monotone"
                dataKey="close"
                stroke={chartTheme.price.line}
                strokeWidth={chartTheme.glow.width}
                strokeOpacity={chartTheme.glow.opacity}
                strokeLinecap={chartTheme.line.cap}
                strokeLinejoin={chartTheme.line.join}
                dot={false}
                activeDot={false}
                isAnimationActive={animate}
                animationDuration={duration}
              />
              {/* The crisp close-price line. */}
              <Line
                type="monotone"
                dataKey="close"
                stroke={chartTheme.price.line}
                strokeWidth={chartTheme.line.width}
                strokeLinecap={chartTheme.line.cap}
                strokeLinejoin={chartTheme.line.join}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: chartTheme.price.line,
                  stroke: "var(--white)",
                  strokeWidth: 2,
                }}
                isAnimationActive={animate}
                animationDuration={duration}
              />
              {/* "Today" — the latest close, marked with a soft halo + crisp dot. */}
              {last ? (
                <ReferenceDot
                  x={last.date}
                  y={last.close}
                  r={chartTheme.marker.haloRadius}
                  fill={chartTheme.price.dot}
                  fillOpacity={chartTheme.marker.haloOpacity}
                  stroke="none"
                  ifOverflow="extendDomain"
                />
              ) : null}
              {last ? (
                <ReferenceDot
                  x={last.date}
                  y={last.close}
                  r={5}
                  fill={chartTheme.price.dot}
                  stroke="var(--white)"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                />
              ) : null}
            </>
          ) : (
            // The candlesticks — a low→high bar per session, drawn by the custom shape.
            <Bar
              dataKey="hl"
              shape={(props: object) => <CandleShape {...(props as CandleShapeProps)} />}
              isAnimationActive={animate}
              animationDuration={duration}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
