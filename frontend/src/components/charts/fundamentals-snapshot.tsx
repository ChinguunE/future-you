"use client"

import * as React from "react"

import { chartTheme } from "@/lib/chart-theme"

/**
 * FundamentalsSnapshot (DESIGN §12 "Your stocks") — the honest "ID card" for a holding,
 * built only from the facts the snapshot actually carries (StockFacts): how much it moves
 * versus the market (beta, with the market pinned at 1.0 so you can SEE it sits past it),
 * and its quality flags — profitable, pays a dividend, in a major index. A flag's meaning
 * is never colour-alone: a check / dash mark + the word carry it, the tint only reinforces.
 * Hand-built DOM (percent-positioned, crisp + responsive); the accessible numbers live in
 * the labels + the ChartCard table. Fully prop-driven — i18n lives in the page.
 */

export type FundamentalsFlag = {
  label: string
  on: boolean
}

export type FundamentalsSnapshotProps = {
  /** market-relative volatility; the market itself is `betaMarket` (1.0) */
  beta: number
  betaMarket: number
  /** the beta shown as a multiple (e.g. "1.8×") */
  betaLabel: string
  /** the bar's title, the "Market" baseline label, and the plain-language caption */
  betaTitle: string
  marketLabel: string
  betaCaption: string
  /** the quality flags (profitable / pays dividend / index member) */
  flags: FundamentalsFlag[]
  /** a concise plain-language name for the whole region */
  ariaLabel: string
}

export function FundamentalsSnapshot({
  beta,
  betaMarket,
  betaLabel,
  betaTitle,
  marketLabel,
  betaCaption,
  flags,
  ariaLabel,
}: FundamentalsSnapshotProps) {
  // Scale ends a little past the higher of beta / the market baseline.
  const betaMax = Math.max(2.5, Math.ceil((Math.max(beta, betaMarket) + 0.5) * 2) / 2)
  const pct = (v: number) => (v / betaMax) * 100
  const pBeta = pct(beta)
  const pMarket = pct(betaMarket)

  return (
    <div
      data-slot="fundamentals"
      className="nums flex h-[300px] w-full flex-col justify-center gap-8 sm:h-[280px]"
      role="group"
      aria-label={ariaLabel}
    >
      {/* ---- Beta vs the market ---- */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-small font-bold text-ink">{betaTitle}</span>
          <span className="nums text-body font-display font-extrabold text-ink">
            {betaLabel}
          </span>
        </div>

        <div className="relative h-9" aria-hidden="true">
          {/* the full scale track */}
          <div
            className="absolute top-1/2 h-2.5 w-full -translate-y-1/2 rounded-pill"
            style={{ backgroundColor: "var(--muted)" }}
          />
          {/* the fill from 0 to beta */}
          <div
            className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-pill"
            style={{ width: `${pBeta}%`, backgroundColor: "var(--green-500)" }}
          />
          {/* the "market = 1.0" baseline — a dashed ink pin */}
          <div
            className="absolute top-1/2 h-8 w-0 -translate-x-1/2 -translate-y-1/2 border-l-2 border-dashed"
            style={{ left: `${pMarket}%`, borderColor: chartTheme.analyst.current }}
          />
          {/* the beta knob */}
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
            style={{
              left: `${pBeta}%`,
              backgroundColor: "var(--green-700)",
              boxShadow: "var(--shadow-card)",
            }}
          />
        </div>

        <div className="flex items-center justify-between text-small">
          <span className="font-bold text-text-muted">{marketLabel}</span>
          <span className="text-text-muted">{betaCaption}</span>
        </div>
      </div>

      {/* ---- Quality flags ---- */}
      <ul className="flex flex-wrap gap-2">
        {flags.map((flag) => (
          <li
            key={flag.label}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-small font-bold ${
              flag.on
                ? "bg-[var(--stat-brand-bg)] text-ink ring-1 ring-[var(--stat-brand-edge)]"
                : "bg-muted text-text-muted"
            }`}
          >
            {flag.on ? (
              // An inline SVG check (not a Unicode glyph — the emoji gate bans dingbats).
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-3.5 text-brand-deep"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
            ) : (
              <span aria-hidden className="leading-none">
                —
              </span>
            )}
            {flag.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
