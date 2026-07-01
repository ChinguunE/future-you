"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

import { chartTheme } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"

/**
 * GoalFundingGauge (DESIGN §12 "Your growth" — the goal-funding probability, e.g.
 * "≈78% chance of CHF X by 2040"). A semicircle "open arc" gauge: a confident brand
 * green sweep fills the SHARE of futures that reach the goal over a faint same-hue
 * "the rest" track, with a raised knob-dot at the tip (the app's tactile signature),
 * the big % centred in the arc's belly, and a plain-language verdict word beneath.
 *
 * Honest by construction: the % is the probability the projection band clears the
 * goal line — the true fraction, drawn as a true fraction of the arc, never zoomed.
 * Never colour-alone (§11): the meaning lives in the % text + the verdict word + its
 * ▲/→/▼ glyph; the green arc only reinforces. Fully prop-driven — every word comes
 * from the caller (i18n lives in the page), every colour from the chart-theme.
 */

export type GoalGaugeVerdict = {
  /** the plain-language verdict word (e.g. "On track") */
  label: string
  /** the direction glyph shown before the word — never colour-alone (▲ / → / ▼) */
  glyph: string
  /** which tone drives the pill colours */
  tone: "pos" | "neutral" | "neg"
}

export type GoalFundingGaugeProps = {
  /** probability of reaching the goal, a fraction 0..1 (drives the arc sweep) */
  probability: number
  /** the big centred percent, already locale-formatted (e.g. "52%") */
  percentLabel: string
  /** the sub-line under the number (e.g. "chance of reaching CHF 100,000 by 2041") */
  subLabel: string
  /** the verdict pill (word + glyph + tone) */
  verdict: GoalGaugeVerdict
  /** a concise plain-language name for the whole chart region */
  ariaLabel: string
}

// The gauge is drawn in a fixed 260×150 viewBox and scales fluidly. The arc is the
// top semicircle of a circle centred at (CX, CY): 180° = the left end, 270° = the
// top, 360° = the right end (SVG angles increase downward, so +sin points down).
const W = 260
const CY = 122
const R = 100
const CX = W / 2

/** A point on the arc circle at an angle in degrees (SVG convention: +y is down). */
function pointAt(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
}

/** The arc path from the left end (180°) clockwise over the top to `endDeg`. */
function arcPath(endDeg: number) {
  const start = pointAt(180)
  const end = pointAt(endDeg)
  // Every partial arc here is ≤ 180°, so the large-arc flag is always 0; sweep 1 is
  // the "increasing angle" direction, which runs left → over the top → right.
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

const VERDICT_SURFACE: Record<GoalGaugeVerdict["tone"], string> = {
  // full-strength --pos/--neg text on the pill wash (never opacity-dimmed — that
  // fails AA), or a calm muted pill for the neutral middle band.
  pos: "bg-[var(--pill-pos-bg)] text-pos",
  neg: "bg-[var(--pill-neg-bg)] text-neg",
  neutral: "bg-muted text-text",
}

function VerdictPill({ verdict }: { verdict: GoalGaugeVerdict }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-small font-bold",
        VERDICT_SURFACE[verdict.tone]
      )}
    >
      <span aria-hidden>{verdict.glyph}</span>
      {verdict.label}
    </span>
  )
}

export function GoalFundingGauge({
  probability,
  percentLabel,
  subLabel,
  verdict,
  ariaLabel,
}: GoalFundingGaugeProps) {
  const reduced = useReducedMotion()
  const p = Math.max(0, Math.min(1, probability))
  const tipDeg = 180 + p * 180 // 180° at 0%, 360° at 100%
  const tip = pointAt(tipDeg)
  const trackD = arcPath(360)
  const progressD = arcPath(tipDeg)

  return (
    // .nums makes the big percent tabular. role="group" + a name gives the region
    // context; the SVG art is decorative (aria-hidden) — the accessible read is the
    // visible % + verdict + the card's "View as table" fallback.
    <div
      className="nums flex h-[380px] w-full flex-col items-center justify-center sm:h-[340px]"
      role="group"
      aria-label={ariaLabel}
    >
      <svg
        viewBox={`0 0 ${W} 150`}
        className="w-full max-w-[300px]"
        role="presentation"
        aria-hidden
      >
        {/* The full arc — the pale "the rest" remainder. */}
        <path
          d={trackD}
          fill="none"
          stroke={chartTheme.gauge.track}
          strokeOpacity={chartTheme.gauge.trackOpacity}
          strokeWidth={chartTheme.gauge.width}
          strokeLinecap="round"
        />
        {/* The filled odds — draws in from the left, gated off for reduced motion. */}
        <motion.path
          data-slot="gauge-arc"
          d={progressD}
          fill="none"
          stroke={chartTheme.gauge.arc}
          strokeWidth={chartTheme.gauge.width}
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            // chartTheme.animation is the CSS/Recharts easing string ("ease-out");
            // motion/react wants its own token, so map to the equivalent "easeOut".
            duration: reduced ? 0 : chartTheme.animation.duration / 1000,
            ease: "easeOut",
          }}
        />
        {/* A faint halo beneath the raised knob-dot — a soft glossy cast. */}
        <circle
          cx={tip.x}
          cy={tip.y}
          r={chartTheme.marker.haloRadius}
          fill={chartTheme.gauge.knob}
          fillOpacity={chartTheme.marker.haloOpacity}
        />
        {/* The tactile tip dot — a white-ringed bead that sits raised on the arc
            (the app's pressable signature), casting a soft token-tinted shadow. */}
        <circle
          cx={tip.x}
          cy={tip.y}
          r={7}
          fill={chartTheme.gauge.knob}
          stroke="var(--white)"
          strokeWidth={3}
          style={{
            filter:
              "drop-shadow(0 2px 1.5px color-mix(in oklab, var(--ink) 22%, transparent))",
          }}
        />
      </svg>

      {/* The number sits in the arc's belly (pulled up), then the sub-line + verdict. */}
      <div className="-mt-[4.75rem] flex flex-col items-center gap-2 text-center">
        <span className="font-display text-[3.25rem] font-bold leading-none text-ink">
          {percentLabel}
        </span>
        <p className="max-w-[15rem] text-small text-text">{subLabel}</p>
        <VerdictPill verdict={verdict} />
      </div>
    </div>
  )
}
