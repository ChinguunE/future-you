import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The shared chart tooltip surface (DESIGN §12 "plain-language tooltips — words,
 * not codes"). A small white card that matches our popovers (hairline ring, soft
 * shadow, rounded), holding a title and labelled value rows. Each chart passes its
 * own plain-language rows; the styling and structure live here so every tooltip
 * reads the same. Tokens only.
 *
 * Rendered by Recharts inside a client chart, so it needs no directive of its own.
 */

function ChartTooltipCard({
  title,
  children,
  className,
}: {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="chart-tooltip"
      className={cn(
        // richer glossy depth (DESIGN §12 richness pass): a lifted cast shadow +
        // a 1px inner top-highlight, still a calm white card on our light palette.
        "min-w-44 rounded-md bg-white px-3 py-2 text-small shadow-[var(--chart-shadow)] ring-1 ring-border",
        className
      )}
    >
      <p className="font-bold text-ink">{title}</p>
      <dl className="mt-1.5 space-y-1">{children}</dl>
    </div>
  )
}

/**
 * One labelled row. `swatch` carries the series' shape+colour (never colour-alone),
 * `dir` is an optional ▲/▼ direction glyph shown before the value. The value uses
 * `.nums` for tabular alignment across rows.
 */
function ChartTooltipRow({
  swatch,
  label,
  value,
  dir,
  dirClassName,
}: {
  swatch?: React.ReactNode
  label: React.ReactNode
  value: React.ReactNode
  dir?: React.ReactNode
  dirClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-text">
        {swatch}
        <span>{label}</span>
      </dt>
      <dd className="nums font-bold text-ink">
        {dir ? (
          <span aria-hidden className={cn("mr-0.5", dirClassName)}>
            {dir}
          </span>
        ) : null}
        {value}
      </dd>
    </div>
  )
}

/** A tiny shape swatch keyed to a series role, so a row's meaning is never colour-only. */
function TooltipSwatch({
  color,
  shape = "line",
}: {
  color: string
  shape?: "line" | "band" | "dot"
}) {
  if (shape === "dot") {
    return (
      <span
        aria-hidden
        className="inline-block size-2.5 rounded-full ring-2 ring-white"
        style={{ backgroundColor: color }}
      />
    )
  }
  if (shape === "band") {
    return (
      <span
        aria-hidden
        className="inline-block h-3 w-3.5 rounded-[3px] opacity-70"
        style={{ backgroundColor: color }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="inline-block h-[3px] w-3.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

export { ChartTooltipCard, ChartTooltipRow, TooltipSwatch }
