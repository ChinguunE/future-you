"use client"

import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { chartTheme } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"

/**
 * HoldingsTable (DESIGN §12 "Tables — first-class") — the sortable holdings table, the
 * centerpiece of Slice 9's tables wave. A table IS a first-class chart type here: this
 * is the rich, interactive presentation (a tiny trend sparkline per row, a proportional
 * weight bar, a role chip, and click-to-sort headers); the ChartCard's plain "View as
 * table" fallback carries the same numbers as static text.
 *
 * Honest by construction (non-negotiable #3): the trend never rests on the sparkline — or
 * on colour — alone. Each spark is paired with a LABELLED signed % and a ▲/▼ glyph (§11),
 * and the sparkline itself is aria-hidden decoration. Presentational + prop-driven: the
 * parent owns the data and passes every string + formatter (i18n stays in the page), and
 * all colours come from chart-theme tokens, so a row can never drift from the app.
 *
 * Accessible sort: each sortable header is a real <button> inside a <th aria-sort=…>, so a
 * screen reader announces the column and its current sort direction; keyboard focus + the
 * roving Tab order come from native buttons.
 */

export type HoldingsSortKey = "name" | "weight" | "risk" | "trend"
export type SortDir = "asc" | "desc"

export type HoldingsTableRow = {
  ticker: string
  /** short human name — a proper noun, identical in EN/FR */
  name: string
  /** localised asset-class label (investment type) */
  typeLabel: string
  /** localised role label (Core / Satellite) */
  roleLabel: string
  role: "core" | "satellite"
  /** a chart-theme sleeveColor key — drives the weight bar + role dot hue */
  sleeve: string
  /** capital share, 0..1 */
  weight: number
  /** share of total portfolio risk, 0..1 */
  risk: number
  /** the mini-series behind the sparkline (oldest → newest) */
  spark: number[]
  /** net change over the sparkline window — the labelled value paired with the line */
  trendPct: number
  trendDir: "up" | "down" | "flat"
}

export type HoldingsTableLabels = {
  colHolding: string
  colType: string
  colWeight: string
  colRisk: string
  colTrend: string
}

type Column = {
  key: HoldingsSortKey
  label: string
  numeric: boolean
}

const TREND_GLYPH: Record<HoldingsTableRow["trendDir"], string> = {
  up: "▲",
  down: "▼",
  flat: "→",
}

const TREND_TEXT: Record<HoldingsTableRow["trendDir"], string> = {
  up: "text-pos",
  down: "text-neg",
  flat: "text-text-muted",
}

const TREND_STROKE: Record<HoldingsTableRow["trendDir"], string> = {
  up: chartTheme.tables.up,
  down: chartTheme.tables.down,
  flat: chartTheme.tables.flat,
}

/** A tiny trend line for one holding — aria-hidden decoration (the labelled % beside it
 *  carries the meaning). A stroked path drawn from the normalised mini-series. */
function Sparkline({
  values,
  dir,
}: {
  values: number[]
  dir: HoldingsTableRow["trendDir"]
}) {
  const w = 68
  const h = 22
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  // Round coords to 1 dp so the path AND the end dot render identical strings on the
  // server and the client (an SVG attribute must match byte-for-byte or hydration tears).
  const round1 = (n: number) => Math.round(n * 10) / 10
  const pts = values.map((v, i) => {
    const x = round1(pad + (i / (values.length - 1)) * (w - 2 * pad))
    const y = round1(pad + (1 - (v - min) / span) * (h - 2 * pad))
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ")
  const last = pts[pts.length - 1]
  const stroke = TREND_STROKE[dir]
  return (
    <svg
      data-slot="sparkline"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill={stroke} />
    </svg>
  )
}

/** A right-aligned numeric cell: the formatted number over a thin bar sized to the
 *  ABSOLUTE fraction (0..1), so the bar length reads as the true share (not relative to
 *  the leader). The number is the primary signal beside it (§11); the bar is aria-hidden. */
function MagnitudeCell({
  value,
  fraction,
  color,
}: {
  value: string
  fraction: number
  color: string
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="nums font-bold text-ink">{value}</span>
      <span
        aria-hidden
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </span>
    </div>
  )
}

function SortButton({
  column,
  active,
  dir,
  onSort,
  ariaLabel,
}: {
  column: Column
  active: boolean
  dir: SortDir
  onSort: (key: HoldingsSortKey) => void
  /** a self-describing name, e.g. "Sort by Weight" — the th's aria-sort carries direction */
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-bold text-ink",
        "hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "cursor-pointer",
        column.numeric && "w-full justify-end"
      )}
    >
      <span>{column.label}</span>
      {/* The active-sort arrow is decorative — the th's aria-sort announces direction. */}
      <span
        aria-hidden
        className={cn(
          "text-[0.7em] leading-none",
          active ? "text-brand-deep" : "text-text-muted/50"
        )}
      >
        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  )
}

export function HoldingsTable({
  rows,
  labels,
  defaultSort = { key: "weight", dir: "desc" },
  formatWeight,
  formatRisk,
  formatTrend,
  sortByLabel,
  ariaLabel,
}: {
  rows: HoldingsTableRow[]
  labels: HoldingsTableLabels
  defaultSort?: { key: HoldingsSortKey; dir: SortDir }
  formatWeight: (v: number) => string
  formatRisk: (v: number) => string
  /** a signed percent, e.g. "+4.2%" */
  formatTrend: (v: number) => string
  /** builds a sort control's accessible name from a column label, e.g. "Sort by Weight" */
  sortByLabel: (column: string) => string
  ariaLabel: string
}) {
  const [sort, setSort] = React.useState(defaultSort)

  const columns: Column[] = [
    { key: "name", label: labels.colHolding, numeric: false },
    { key: "weight", label: labels.colWeight, numeric: true },
    { key: "risk", label: labels.colRisk, numeric: true },
    { key: "trend", label: labels.colTrend, numeric: true },
  ]

  const onSort = (key: HoldingsSortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : // numbers open descending (biggest first); the name opens A→Z.
          { key, dir: key === "name" ? "asc" : "desc" }
    )

  const sorted = React.useMemo(() => {
    const val = (r: HoldingsTableRow) =>
      sort.key === "name"
        ? r.name
        : sort.key === "weight"
          ? r.weight
          : sort.key === "risk"
            ? r.risk
            : r.trendPct
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : (av as number) - (bv as number)
      return sort.dir === "asc" ? cmp : -cmp
    })
    return copy
  }, [rows, sort])

  const ariaSort = (key: HoldingsSortKey): React.AriaAttributes["aria-sort"] =>
    sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"

  return (
    <Table data-slot="holdings-table" aria-label={ariaLabel}>
      <TableHeader>
        <TableRow>
          {/* Holding (name/ticker/role) — sortable by name. */}
          <TableHead aria-sort={ariaSort("name")}>
            <SortButton
              column={columns[0]}
              active={sort.key === "name"}
              dir={sort.dir}
              onSort={onSort}
              ariaLabel={sortByLabel(columns[0].label)}
            />
          </TableHead>
          {/* Type — a plain, non-sortable label column. */}
          <TableHead>{labels.colType}</TableHead>
          {/* Weight / Risk / Trend — numeric, sortable, right-aligned. */}
          <TableHead className="text-right" aria-sort={ariaSort("weight")}>
            <SortButton
              column={columns[1]}
              active={sort.key === "weight"}
              dir={sort.dir}
              onSort={onSort}
              ariaLabel={sortByLabel(columns[1].label)}
            />
          </TableHead>
          <TableHead className="text-right" aria-sort={ariaSort("risk")}>
            <SortButton
              column={columns[2]}
              active={sort.key === "risk"}
              dir={sort.dir}
              onSort={onSort}
              ariaLabel={sortByLabel(columns[2].label)}
            />
          </TableHead>
          <TableHead className="text-right" aria-sort={ariaSort("trend")}>
            <SortButton
              column={columns[3]}
              active={sort.key === "trend"}
              dir={sort.dir}
              onSort={onSort}
              ariaLabel={sortByLabel(columns[3].label)}
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.ticker}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartTheme.sleeveColor[row.sleeve] }}
                  />
                  <span className="font-bold text-ink">{row.name}</span>
                  <span className="text-small text-text-muted">{row.ticker}</span>
                </div>
                {/* Role chip — text, so it never leans on colour (§11). Uses --text (not
                    --text-muted) so the label clears AA on the cream chip fill. */}
                <span className="w-fit rounded-pill bg-muted px-2 py-0.5 text-xs font-bold tracking-wide text-text uppercase">
                  {row.roleLabel}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-text">{row.typeLabel}</TableCell>
            {/* Weight — the number with a thin bar sized to the ABSOLUTE share (a 44%
                holding fills 44% of the track, so the bar agrees with its label). */}
            <TableCell className="text-right">
              <MagnitudeCell
                value={formatWeight(row.weight)}
                fraction={row.weight}
                color={chartTheme.sleeveColor[row.sleeve]}
              />
            </TableCell>
            {/* Risk — same visual grammar as Weight (a neutral magnitude bar), so all
                three numeric columns read at a glance, not just two. */}
            <TableCell className="text-right">
              <MagnitudeCell
                value={formatRisk(row.risk)}
                fraction={row.risk}
                color={chartTheme.tables.riskBar}
              />
            </TableCell>
            {/* Trend — the sparkline (decorative) + a labelled signed %, never alone. */}
            <TableCell className="text-right">
              <span className="flex items-center justify-end gap-2">
                <Sparkline values={row.spark} dir={row.trendDir} />
                <span
                  className={cn("nums font-bold whitespace-nowrap", TREND_TEXT[row.trendDir])}
                >
                  <span aria-hidden className="mr-0.5 text-[0.72em]">
                    {TREND_GLYPH[row.trendDir]}
                  </span>
                  {formatTrend(row.trendPct)}
                </span>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
