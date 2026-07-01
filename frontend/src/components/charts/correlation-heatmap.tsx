"use client"

import * as React from "react"

import { chartTheme } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"
import {
  correlationRelation,
  type CorrelationEntity,
  type CorrelationMatrix,
} from "@/app/[locale]/charts-demo/risk-data"

/**
 * CorrelationHeatmap (DESIGN §12 "Your risk"). A grid of every pair of holdings, tinted
 * by how closely they move: green = move together, grape = move apart, the paper tint in
 * the middle = barely related. Hand-built from real DOM cells (not an SVG), so it stays
 * crisp, SSR-clean, and accessible — each cell prints its number and carries a spoken
 * label, so meaning NEVER rests on colour alone (§11, non-negotiable #3). Cell colours are
 * a live `color-mix` of the design tokens (never a hard-coded hex); the label flips to
 * white only where a cell is dark enough that white reads better than ink (verified AA).
 */

export type CorrelationHeatmapLabels = {
  /** relation words, chosen by the sign of ρ — spoken in each cell's label */
  together: string
  apart: string
  unrelated: string
  /** the diagonal (a holding with itself) */
  self: string
  /** scale legend ends */
  scaleApart: string
  scaleTogether: string
}

export type CorrelationHeatmapProps = {
  matrix: CorrelationMatrix
  labels: CorrelationHeatmapLabels
  /** formats ρ as a signed decimal, e.g. "0.80" / "−0.12" */
  formatCorr: (value: number) => string
  /** builds a cell's spoken label from the pair + value (i18n lives in the page) */
  describeCell: (
    a: CorrelationEntity,
    b: CorrelationEntity,
    value: number
  ) => string
  ariaLabel: string
}

/** The short root ticker (before the market suffix) for a compact axis label. */
function shortTicker(ticker: string): string {
  return ticker.split(".")[0]
}

/** The diverging tint for a correlation cell — a live color-mix of the palette tokens. */
function cellFill(value: number): string {
  const { positive, negative, neutral, maxMix } = chartTheme.correlation
  const mix = Math.round(Math.min(1, Math.abs(value)) * maxMix)
  const hue = value >= 0 ? positive : negative
  return `color-mix(in oklab, ${hue} ${mix}%, ${neutral})`
}

function relationWord(
  value: number,
  labels: CorrelationHeatmapLabels
): string {
  return labels[correlationRelation(value)]
}

/** A single ρ cell — its tint carries the strength, its printed number the exact value.
 *  Dark ink prints on every tint in range (AA); the diagonal (self) is a muted "—". The
 *  `title` gives a hover read-out for mouse users; the accessible data path is the card's
 *  "view as table" fallback (the visual grid itself is aria-hidden, like the other charts). */
function HeatCell({
  value,
  isSelf,
  title,
  formatCorr,
}: {
  value: number
  isSelf: boolean
  title: string
  formatCorr: (value: number) => string
}) {
  const style: React.CSSProperties = isSelf
    ? { background: "var(--muted)", color: "var(--text-muted)" }
    : { background: cellFill(value), color: "var(--ink)" }
  return (
    <div
      title={title}
      style={style}
      className={cn(
        "flex aspect-square min-w-9 items-center justify-center rounded-[5px] text-small font-bold tabular-nums",
        "outline-offset-1 transition-[outline] hover:outline hover:outline-2 hover:outline-ink"
      )}
    >
      <span>{isSelf ? "—" : formatCorr(value)}</span>
    </div>
  )
}

/** The grape → paper → green scale strip, so the tint meaning is explicit. */
function ScaleStrip({ labels }: { labels: CorrelationHeatmapLabels }) {
  const { positive, negative, neutral } = chartTheme.correlation
  return (
    <div className="flex items-center gap-3 text-small text-text">
      <span>{labels.scaleApart}</span>
      <span
        aria-hidden
        className="h-3 flex-1 rounded-pill ring-1 ring-border"
        style={{
          background: `linear-gradient(to right, ${negative}, ${neutral}, ${positive})`,
        }}
      />
      <span>{labels.scaleTogether}</span>
    </div>
  )
}

export function CorrelationHeatmap({
  matrix,
  labels,
  formatCorr,
  describeCell,
  ariaLabel,
}: CorrelationHeatmapProps) {
  const { entities, cells } = matrix
  const n = entities.length

  // A stable lookup so a cell reads its ρ without an O(n²) scan per render.
  const byCell = React.useMemo(() => {
    const m = new Map<string, (typeof cells)[number]>()
    for (const c of cells) m.set(`${c.row},${c.col}`, c)
    return m
  }, [cells])

  // Grid: a corner + N column headers, then N rows of a row-header + N cells. The
  // visual grid is aria-hidden — like the SVG charts, the region is NAMED for AT via the
  // wrapper and the real data path is the card's "view as table" fallback, so screen
  // readers get the clean table rather than a jumble of loose header + number divs. The
  // wrapper scrolls sideways on very narrow screens so cells never crush.
  const template = `minmax(3.5rem, auto) repeat(${n}, minmax(2.25rem, 1fr))`

  return (
    <div
      data-slot="correlation-heatmap"
      role="group"
      aria-label={ariaLabel}
      className="space-y-4"
    >
      <div className="overflow-x-auto" aria-hidden>
        <div
          className="grid min-w-[24rem] gap-1"
          style={{ gridTemplateColumns: template }}
        >
          {/* Header row: an empty corner, then the column tickers. */}
          <div />
          {entities.map((e) => (
            <div
              key={`col-${e.ticker}`}
              title={e.name}
              className="flex items-end justify-center pb-1 text-center text-small font-bold text-text-muted"
            >
              {shortTicker(e.ticker)}
            </div>
          ))}

          {/* One row per holding: a row header, then its N cells. */}
          {entities.map((rowE, r) => (
            <React.Fragment key={`row-${rowE.ticker}`}>
              <div
                title={rowE.name}
                className="flex items-center justify-end pr-2 text-small font-bold text-text-muted"
              >
                {shortTicker(rowE.ticker)}
              </div>
              {entities.map((colE, c) => {
                const cell = byCell.get(`${r},${c}`)
                const value = cell?.value ?? 0
                const isSelf = cell?.isSelf ?? r === c
                const title = isSelf
                  ? `${rowE.name} · ${labels.self}`
                  : `${describeCell(rowE, colE, value)} — ${relationWord(value, labels)}`
                return (
                  <HeatCell
                    key={`${r}-${c}`}
                    value={value}
                    isSelf={isSelf}
                    title={title}
                    formatCorr={formatCorr}
                  />
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <ScaleStrip labels={labels} />
    </div>
  )
}
