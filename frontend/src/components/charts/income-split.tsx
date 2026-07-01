import * as React from "react"

import { chartTheme } from "@/lib/chart-theme"

/**
 * IncomeSplit (DESIGN §12 "Tables — first-class") — "which holdings pay you": the honest
 * reframe of the spec's "dividend-income". The snapshot carries only a `pays_dividend`
 * BOOLEAN, never a yield (DATA.md), so this shows WHICH holdings distribute cash out to
 * you vs reinvest it internally, and the share of the book on each side — and NEVER an
 * invented yield figure.
 *
 * A labelled split bar heads two grouped lists. Honest by construction: each bar segment
 * carries its label + share (never colour-alone, §11); --gold = paid out to you, --green
 * = reinvested. Presentational + prop-driven; colours from chart-theme tokens.
 */

export type IncomeHolding = {
  ticker: string
  name: string
  /** a chart-theme sleeveColor key — the row's colour dot */
  sleeve: string
  weight: number
}

export type IncomeGroup = {
  /** localised character label, e.g. "Pays you income" / "Reinvests internally" */
  label: string
  /** share of the whole book on this side, 0..1 */
  share: number
  holdings: IncomeHolding[]
}

export type IncomeSplitLabels = {
  /** an accessible description of the split bar, e.g. "16% pays income, 84% reinvests" */
  barAria: string
}

function GroupList({
  group,
  tone,
  formatShare,
  formatWeight,
}: {
  group: IncomeGroup
  tone: "distributes" | "reinvests"
  formatShare: (v: number) => string
  formatWeight: (v: number) => string
}) {
  const color =
    tone === "distributes"
      ? chartTheme.tables.distributes
      : chartTheme.tables.reinvests
  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 font-bold text-ink">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          {group.label}
        </span>
        <span className="nums font-display text-h3 font-extrabold text-ink">
          {formatShare(group.share)}
        </span>
      </div>
      <ul className="space-y-1.5">
        {group.holdings.map((h) => (
          <li
            key={h.ticker}
            className="flex items-center justify-between gap-3 border-t border-border pt-1.5 text-small"
          >
            <span className="flex items-center gap-2 text-text">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: chartTheme.sleeveColor[h.sleeve] }}
              />
              <span className="font-semibold text-ink">{h.name}</span>
              <span className="text-text-muted">{h.ticker}</span>
            </span>
            <span className="nums shrink-0 text-text-muted">
              {formatWeight(h.weight)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function IncomeSplit({
  distributes,
  reinvests,
  labels,
  formatShare,
  formatWeight,
  ariaLabel,
}: {
  distributes: IncomeGroup
  reinvests: IncomeGroup
  labels: IncomeSplitLabels
  formatShare: (v: number) => string
  formatWeight: (v: number) => string
  ariaLabel: string
}) {
  // Guard the widths so a zero-share side never yields a NaN width.
  const total = distributes.share + reinvests.share || 1
  const distPct = (distributes.share / total) * 100

  return (
    <div data-slot="income-split" role="group" aria-label={ariaLabel} className="space-y-5">
      {/* The split bar — a pure proportional visual (role=img + aria-label). The %s are
          carried, large + labelled, by the two group headers directly below, so meaning
          never rests on the bar's colour alone (§11) and no low-contrast text sits on a
          coloured fill. */}
      <div
        role="img"
        aria-label={labels.barAria}
        className="flex h-6 w-full overflow-hidden rounded-lg ring-1 ring-border"
      >
        <span
          className="block h-full"
          style={{
            width: `${distPct}%`,
            backgroundColor: chartTheme.tables.distributes,
          }}
        />
        <span
          className="block h-full"
          style={{
            width: `${100 - distPct}%`,
            backgroundColor: chartTheme.tables.reinvests,
          }}
        />
      </div>

      {/* The two grouped lists, side by side on wider cards, stacked on narrow ones. */}
      <div className="flex flex-col gap-6 @md:flex-row @md:gap-8">
        <GroupList
          group={distributes}
          tone="distributes"
          formatShare={formatShare}
          formatWeight={formatWeight}
        />
        <GroupList
          group={reinvests}
          tone="reinvests"
          formatShare={formatShare}
          formatWeight={formatWeight}
        />
      </div>
    </div>
  )
}
