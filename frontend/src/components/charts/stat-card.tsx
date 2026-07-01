import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * StatCard (DESIGN §6 "research/dashboard" mode + §12) — the KPI element the premium
 * fintech dashboards lead with, re-skinned to our LIGHT palette: a small tinted card
 * holding a plain-language label, a big Baloo number, and an optional ▲/▼ DELTA PILL.
 *
 * Honesty is sacred (non-negotiable #3): a delta's direction is carried by its glyph
 * (▲/▼/→) AND its words, never colour alone (DESIGN §11), and every figure the caller
 * passes traces to a real source value. Presentational + prop-driven — all strings and
 * pre-formatted numbers come from the caller (i18n stays in the page), all colours from
 * tokens (color-mix washes in globals.css), so a stat-card can never drift from the app.
 *
 * Reusable across the analytics surface: a chart-card's KPI header, the Slice-9
 * catalogue, and the Slice-11 demo dashboard row.
 */

export type StatTone = "brand" | "neg" | "gold" | "sky" | "neutral"

export type StatDelta = {
  /** up = a gain, down = a loss, flat = little/no change — never colour-alone */
  direction: "up" | "down" | "flat"
  /** the already-formatted delta (e.g. "+CHF 91'000", "−0.9%") */
  value: React.ReactNode
  /** a short plain-language qualifier (e.g. "vs today") */
  label?: React.ReactNode
}

export type StatCardProps = {
  /** the plain-language label / eyebrow (e.g. "Most likely by 2041") */
  label: React.ReactNode
  /** the headline figure (already formatted + locale-aware) */
  value: React.ReactNode
  /** an optional ▲/▼ delta pill */
  delta?: StatDelta
  /** an optional plain-language note under the value (e.g. "80% of outcomes") */
  note?: React.ReactNode
  /** the surface tint — groups a card to its meaning (brand = growth, neg = risk, …) */
  tone?: StatTone
  /** a small decorative punctuation (e.g. a tiny Sprout) at the top-right */
  icon?: React.ReactNode
  className?: string
}

const TONE_SURFACE: Record<StatTone, string> = {
  brand: "bg-[var(--stat-brand-bg)] ring-[var(--stat-brand-edge)]",
  neg: "bg-[var(--stat-neg-bg)] ring-[var(--stat-neg-edge)]",
  gold: "bg-[var(--stat-gold-bg)] ring-[var(--stat-gold-edge)]",
  sky: "bg-[var(--stat-sky-bg)] ring-[var(--stat-sky-edge)]",
  neutral: "bg-[var(--stat-neutral-bg)] ring-[var(--stat-neutral-edge)]",
}

const PILL_SURFACE: Record<StatDelta["direction"], string> = {
  up: "bg-[var(--pill-pos-bg)] text-pos",
  down: "bg-[var(--pill-neg-bg)] text-neg",
  flat: "bg-[var(--pill-flat-bg)] text-text-muted",
}

/** ▲ gain · ▼ loss · → little/no change. Geometric glyphs (not emoji), so meaning
 *  never rests on colour and the check:emoji gate stays happy. */
const PILL_GLYPH: Record<StatDelta["direction"], string> = {
  up: "▲",
  down: "▼",
  flat: "→",
}

function DeltaPill({ delta }: { delta: StatDelta }) {
  return (
    <span
      className={cn(
        "nums inline-flex w-fit items-center gap-1 rounded-pill px-2 py-0.5 text-small font-bold whitespace-nowrap",
        PILL_SURFACE[delta.direction]
      )}
    >
      <span aria-hidden className="text-[0.72em] leading-none">
        {PILL_GLYPH[delta.direction]}
      </span>
      <span>{delta.value}</span>
      {/* The qualifier is set a weight lighter than the value to read as secondary —
          NOT dimmed with opacity, which would drop the coloured text below AA. */}
      {delta.label ? (
        <span className="font-semibold">{delta.label}</span>
      ) : null}
    </span>
  )
}

export function StatCard({
  label,
  value,
  delta,
  note,
  tone = "neutral",
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      data-tone={tone}
      className={cn(
        // gloss = the soft cast shadow + a 1px inner top-highlight (--stat-shadow)
        "relative flex flex-col gap-1.5 overflow-hidden rounded-lg p-4 ring-1 shadow-[var(--stat-shadow)]",
        TONE_SURFACE[tone],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-small font-bold tracking-wide text-text-muted uppercase">
          {label}
        </p>
        {icon ? <span className="-mt-1 -mr-1 shrink-0">{icon}</span> : null}
      </div>
      <p className="nums font-display text-[1.625rem] leading-tight font-extrabold text-ink">
        {value}
      </p>
      {delta ? <DeltaPill delta={delta} /> : null}
      {note ? <p className="text-small text-text-muted">{note}</p> : null}
    </div>
  )
}

/**
 * StatRow — lays a set of (up to three) StatCards out as a KPI header. It uses
 * CONTAINER queries, not viewport breakpoints, so it adapts to the width of the card
 * it sits in — one column when the card is narrow, three only when the card is wide
 * enough that a franc number won't clip. That matters because a chart-card can be
 * full-width on mobile yet only ~half-width in the 2-up dashboard grid. Its parent
 * (the ChartCard) is marked `@container`. Override the columns via className.
 */
export function StatRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="stat-row"
      className={cn(
        "grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  )
}
