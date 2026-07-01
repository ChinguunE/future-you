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

/**
 * ExposureTable (DESIGN §12 "Tables — first-class") — "where your money sits": a ranked
 * table of the portfolio's exposure by investment TYPE (asset class), each row carrying a
 * proportional in-row bar so the concentration reads at a glance. It's the honest reframe
 * of the spec's "sector-exposure": the snapshot carries no GICS sector taxonomy (DATA.md —
 * the same deferral as Wave D), so we group by the asset class we DO hold.
 *
 * Honest by construction: the bar is never the only signal — every row prints its share
 * (tabular) and its holdings count. Presentational + prop-driven (rows are pre-ranked by
 * the parent; all strings + formatters come from the page), colours from chart-theme.
 */

export type ExposureTableRow = {
  /** a stable key (the asset-class key) */
  key: string
  /** localised type / asset-class label */
  typeLabel: string
  /** a chart-theme sleeveColor key — the row's colour dot + bar hue */
  sleeve: string
  /** portfolio share in this type, 0..1 */
  share: number
  /** how many holdings make up this type */
  holdingCount: number
}

export type ExposureTableLabels = {
  colType: string
  colShare: string
  colHoldings: string
}

export function ExposureTable({
  rows,
  labels,
  formatShare,
  formatCount,
  ariaLabel,
}: {
  rows: ExposureTableRow[]
  labels: ExposureTableLabels
  formatShare: (v: number) => string
  formatCount: (v: number) => string
  ariaLabel: string
}) {
  return (
    <Table data-slot="exposure-table" aria-label={ariaLabel}>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.colType}</TableHead>
          {/* The bar + its share sit in one wide column, headed by "Share". */}
          <TableHead>{labels.colShare}</TableHead>
          <TableHead className="text-right">{labels.colHoldings}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: chartTheme.sleeveColor[row.sleeve] }}
                />
                <span className="font-bold text-ink">{row.typeLabel}</span>
              </span>
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-2.5 min-w-24 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      // Absolute share of the whole portfolio: a 44% type fills 44% of the
                      // track, so the bar length agrees with the % printed beside it.
                      width: `${Math.min(100, row.share * 100)}%`,
                      backgroundColor: chartTheme.sleeveColor[row.sleeve],
                    }}
                  />
                </span>
                <span className="nums w-14 shrink-0 text-right font-bold text-ink">
                  {formatShare(row.share)}
                </span>
              </span>
            </TableCell>
            <TableCell className="nums text-right text-text">
              {formatCount(row.holdingCount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
