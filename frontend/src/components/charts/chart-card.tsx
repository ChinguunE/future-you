"use client"

import * as React from "react"

import { Card, CardTitle } from "@/components/ui/card"
import {
  EquationBlock,
  type EquationBlockProps,
} from "@/components/ui/equation-block"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * ChartCard (DESIGN §5 "Chart frame" / §12 "The chart card") — the ONLY sanctioned
 * way to render a chart, so every chart inherits the same honesty and house style.
 * It frames a chart with:
 *   - a plain-language QUESTION title ("Will I reach my goal?");
 *   - the chart, with a plain-language legend (shape + colour, never colour-alone);
 *   - a one-line "What this tells you" caption;
 *   - a short/medium/long horizon toggle that recasts time-sensitive charts;
 *   - a "View as table" switch (the accessibility path — a real, sortable-later table);
 *   - an optional "Show the maths" block that REUSES the Slice-7 EquationBlock
 *     (numbers + KaTeX), with its decorative reward omitted for a calm chart card.
 *
 * Presentational + prop-driven: the parent owns the data and the horizon state (it
 * recasts the data when the horizon changes) and passes every string in, so i18n
 * stays in the page. Colours come only from the chart-theme via the chart child.
 */

export type ChartCardLegendItem = {
  label: string
  /** a token colour string, e.g. `var(--green-700)` */
  color: string
  /** the swatch shape, so the series reads without relying on colour (DESIGN §11) */
  shape: "line" | "band" | "dashed" | "dot"
}

export type ChartCardHorizon = {
  value: string
  onValueChange: (value: string) => void
  /** the control's visible label (e.g. "Time frame") */
  label: string
  options: { value: string; label: string }[]
}

export type ChartCardColumn = {
  key: string
  label: string
  /** right-align + tabular for money/number columns */
  numeric?: boolean
}

export type ChartCardTable = {
  caption?: string
  columns: ChartCardColumn[]
  rows: Array<Record<string, React.ReactNode>>
}

export type ChartCardViewLabels = {
  chart: string
  table: string
  /** an accessible name for the chart/table switch */
  group: string
}

export type ChartCardProps = {
  /** the plain-language question */
  title: React.ReactNode
  /** the "what this tells you" line, in plain words */
  caption: React.ReactNode
  viewLabels: ChartCardViewLabels
  /** the data as a table — the accessible fallback, shown by the view switch */
  table: ChartCardTable
  legend?: ChartCardLegendItem[]
  horizon?: ChartCardHorizon
  /** the "Show the maths" block (Slice-7 EquationBlock; reward omitted for charts) */
  maths?: Omit<EquationBlockProps, "reward">
  /** start on the chart (default) or the table — handy for the demo + tests */
  defaultView?: "chart" | "table"
  /** a small Sprout to punctuate the insight (DESIGN §12) */
  mascot?: React.ReactNode
  /** the themed chart */
  children: React.ReactNode
  className?: string
}

function LegendSwatch({
  shape,
  color,
}: {
  shape: ChartCardLegendItem["shape"]
  color: string
}) {
  if (shape === "dot") {
    return (
      <span
        aria-hidden
        className="inline-block size-3 shrink-0 rounded-full ring-2 ring-white"
        style={{ backgroundColor: color }}
      />
    )
  }
  if (shape === "band") {
    return (
      <span
        aria-hidden
        className="inline-block h-3.5 w-5 shrink-0 rounded-[4px] opacity-50"
        style={{ backgroundColor: color }}
      />
    )
  }
  if (shape === "dashed") {
    return (
      <span
        aria-hidden
        className="inline-block h-0 w-5 shrink-0 border-t-2 border-dashed"
        style={{ borderColor: color }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="inline-block h-[3px] w-5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

function ChartLegend({ items }: { items: ChartCardLegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 text-small text-text"
        >
          <LegendSwatch shape={item.shape} color={item.color} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

function ChartDataTable({ table }: { table: ChartCardTable }) {
  return (
    // On phones the table is bounded to a capped-height scroll region so a long
    // series doesn't dominate the page — every row stays reachable by scrolling
    // (the a11y fallback). Desktop stays fuller (no cap). Money cells never wrap.
    <Table wrapperClassName="max-h-96 overflow-y-auto sm:max-h-none">
      {table.caption ? <TableCaption>{table.caption}</TableCaption> : null}
      <TableHeader className="sticky top-0 z-10 bg-muted sm:static sm:bg-muted/60">
        <TableRow>
          {table.columns.map((col) => (
            <TableHead
              key={col.key}
              className={col.numeric ? "text-right" : undefined}
            >
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row, i) => (
          <TableRow key={i}>
            {table.columns.map((col) => (
              <TableCell
                key={col.key}
                className={
                  col.numeric ? "text-right whitespace-nowrap" : undefined
                }
              >
                {row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ChartCard({
  title,
  caption,
  viewLabels,
  table,
  legend,
  horizon,
  maths,
  defaultView = "chart",
  mascot,
  children,
  className,
}: ChartCardProps) {
  const [view, setView] = React.useState<"chart" | "table">(defaultView)
  const horizonLabelId = React.useId()

  return (
    <Card data-slot="chart-card" className={cn("gap-5", className)}>
      {/* Title (the plain-language question) + an optional Sprout. */}
      <div className="flex items-start justify-between gap-4">
        <CardTitle className="max-w-prose">{title}</CardTitle>
        {mascot ? <div className="-mt-1 shrink-0">{mascot}</div> : null}
      </div>

      {/* Controls: the horizon toggle (left) + the chart/table view switch (right). */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {horizon ? (
          <div className="flex flex-col gap-1.5">
            <span
              id={horizonLabelId}
              className="text-small font-bold text-ink"
            >
              {horizon.label}
            </span>
            <Segmented
              type="single"
              value={horizon.value}
              onValueChange={(v) => v && horizon.onValueChange(v)}
              aria-labelledby={horizonLabelId}
            >
              {horizon.options.map((opt) => (
                <SegmentedItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SegmentedItem>
              ))}
            </Segmented>
          </div>
        ) : (
          <span />
        )}

        <Segmented
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as "chart" | "table")}
          aria-label={viewLabels.group}
          className="ml-auto"
        >
          <SegmentedItem value="chart">{viewLabels.chart}</SegmentedItem>
          <SegmentedItem value="table">{viewLabels.table}</SegmentedItem>
        </Segmented>
      </div>

      {/* The chart (with its legend) or the table fallback. */}
      {view === "chart" ? (
        <div className="space-y-4">
          {children}
          {legend ? <ChartLegend items={legend} /> : null}
        </div>
      ) : (
        <ChartDataTable table={table} />
      )}

      {/* "What this tells you" — the plain-language takeaway. */}
      <p className="max-w-prose text-body text-text">{caption}</p>

      {/* Optional "Show the maths" (the reused EquationBlock, collapsed). */}
      {maths ? <EquationBlock {...maths} /> : null}
    </Card>
  )
}
