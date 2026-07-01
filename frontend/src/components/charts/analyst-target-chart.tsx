"use client"

import * as React from "react"

import { chartTheme } from "@/lib/chart-theme"

/**
 * AnalystTargetChart (DESIGN §12 "Your stocks") — where a panel of analysts thinks a
 * stock could go: the LOW→HIGH range as a calm rail, the MEAN (consensus) as a gold
 * knob, and where it trades TODAY as an ink marker. The reach from today to the
 * consensus is tinted by direction (upside vs downside) — but the meaning never rests
 * on colour: a ▲/▼ glyph + the signed percent + the marker positions all carry it, and
 * every price is printed. Hand-built DOM (percent-positioned, so it's crisp + responsive
 * with no scale maths); the accessible numbers live in the labels + the ChartCard table.
 *
 * Fully prop-driven — every word comes from the caller (i18n lives in the page).
 */

export type AnalystTargetLabels = {
  /** the "trades today" marker label */
  today: string
  /** the low-target end label */
  low: string
  /** the consensus (mean) knob label */
  consensus: string
  /** the high-target end label */
  high: string
  /** shown in the ▲/▼ pill before the percent — the move to consensus is up */
  upside: string
  /** …or down */
  downside: string
}

export type AnalystTargetChartProps = {
  /** where it trades today */
  current: number
  low: number
  mean: number
  high: number
  labels: AnalystTargetLabels
  /** formats a price (full, e.g. "$205") */
  formatPrice: (value: number) => string
  /** formats the implied move as a signed percent (e.g. "+19%") */
  formatUpside: (value: number) => string
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

export function AnalystTargetChart({
  current,
  low,
  mean,
  high,
  labels,
  formatPrice,
  formatUpside,
  ariaLabel,
}: AnalystTargetChartProps) {
  // A padded domain so the end labels + the today marker never sit flush to the edge.
  const lo = Math.min(low, current)
  const hi = Math.max(high, current)
  const pad = (hi - lo) * 0.12 || hi * 0.06
  const domainMin = lo - pad
  const domainMax = hi + pad
  const pct = (v: number) =>
    ((v - domainMin) / (domainMax - domainMin)) * 100

  const up = mean >= current
  const upside = mean / current - 1
  // The reach segment (today ↔ consensus), tinted by direction.
  const reachLeft = pct(Math.min(current, mean))
  const reachRight = pct(Math.max(current, mean))
  const reachColor = up ? chartTheme.analyst.reach : chartTheme.neg

  const pLow = pct(low)
  const pHigh = pct(high)
  const pMean = pct(mean)
  const pCurrent = pct(current)

  return (
    <div
      data-slot="analyst-target"
      className="nums flex h-[300px] w-full flex-col justify-center sm:h-[280px]"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="mx-auto w-full max-w-xl px-2">
        {/* ---- Above the rail: the consensus knob's label + the upside/downside pill. */}
        <div className="relative mb-3 h-14">
          <div
            className="absolute flex -translate-x-1/2 flex-col items-center gap-1 text-center"
            style={{ left: `${pMean}%` }}
          >
            <span
              className={`nums inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-small font-bold whitespace-nowrap ${
                up ? "bg-[var(--pill-pos-bg)] text-pos" : "bg-[var(--pill-neg-bg)] text-neg"
              }`}
            >
              <span aria-hidden className="text-[0.72em] leading-none">
                {up ? "▲" : "▼"}
              </span>
              {formatUpside(upside)}
              <span className="font-semibold">
                {up ? labels.upside : labels.downside}
              </span>
            </span>
            <span className="text-small font-bold text-text-muted">
              {labels.consensus}
            </span>
          </div>
        </div>

        {/* ---- The rail: pale low→high range, the tinted today↔consensus reach, the gold
             consensus knob, and the ink "today" marker. Decorative (aria-hidden). ---- */}
        <div className="relative h-5" aria-hidden="true">
          {/* the analyst low→high range */}
          <div
            className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-pill"
            style={{
              left: `${pLow}%`,
              width: `${pHigh - pLow}%`,
              backgroundColor: "var(--green-300)",
            }}
          />
          {/* today → consensus reach (the implied move) */}
          <div
            className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-pill"
            style={{
              left: `${reachLeft}%`,
              width: `${reachRight - reachLeft}%`,
              backgroundColor: reachColor,
            }}
          />
          {/* the consensus (mean) knob — a gold coin */}
          <div
            className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
            style={{
              left: `${pMean}%`,
              backgroundColor: chartTheme.analyst.mean,
              boxShadow: "var(--shadow-card)",
            }}
          />
          {/* the "today" marker — a tall ink pin through the rail */}
          <div
            className="absolute top-1/2 h-9 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${pCurrent}%`, backgroundColor: chartTheme.analyst.current }}
          />
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
            style={{ left: `${pCurrent}%`, backgroundColor: chartTheme.analyst.current }}
          />
        </div>

        {/* ---- Below the rail: the low + high end prices, and the today price. ---- */}
        <div className="relative mt-3 h-14">
          <div
            className="absolute flex -translate-x-1/2 flex-col items-center text-center"
            style={{ left: `${pCurrent}%` }}
          >
            <span className="text-small font-bold text-ink">{labels.today}</span>
            <span className="nums text-small font-bold text-ink">
              {formatPrice(current)}
            </span>
          </div>
        </div>

        {/* the low / high anchors sit on their own row so they never collide with today */}
        <div className="mt-1 flex items-start justify-between text-small">
          <div className="flex flex-col">
            <span className="font-bold text-text-muted">{labels.low}</span>
            <span className="nums font-bold text-ink">{formatPrice(low)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="font-bold text-text-muted">{labels.high}</span>
            <span className="nums font-bold text-ink">{formatPrice(high)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
