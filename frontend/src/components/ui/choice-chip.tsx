import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * ChoiceChip — the selectable quiz pill (DESIGN §5): the risk quiz
 * (Cautious / Balanced / Adventurous) and "what interests you." Rest is a white
 * outlined pill; selected fills with the --green-300 tint + a --green-600 border
 * and pops with a small bounce.
 *
 * The `icon` slot is for one of our own library illustrations — pass an
 * <Illustration> (or <Sprout>) marked `decorative` so the chip's text stays the
 * accessible name. No emoji, no third-party icon fonts; if a choice has no
 * fitting illustration yet, leave the chip text-only.
 *
 * Accessibility: selection is conveyed three ways, never colour alone (DESIGN
 * §11) — `aria-pressed` for assistive tech, the green border, and the inline
 * check that fades in. --ink text on the green-300 tint clears AA at 8.22:1. The
 * pop is gated behind `motion-safe:`, so reduced-motion users get an instant
 * change.
 *
 * Presentational + uncontrolled-friendly: the parent owns `selected` and handles
 * `onClick` (single-select radio groups and multi-select interests both work).
 */
export interface ChoiceChipProps
  extends Omit<React.ComponentProps<"button">, "children"> {
  /** Whether this chip is currently chosen. */
  selected?: boolean
  /** A decorative library <Illustration>. Optional — omit for a text-only chip. */
  icon?: React.ReactNode
  children: React.ReactNode
}

function ChoiceChip({
  selected = false,
  icon,
  className,
  children,
  ...props
}: ChoiceChipProps) {
  return (
    <button
      type="button"
      data-slot="choice-chip"
      data-selected={selected}
      aria-pressed={selected}
      className={cn(
        "group/chip inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-pill border-2 px-4 py-2 font-bold whitespace-nowrap select-none",
        "border-[var(--chip-border)] bg-white text-ink transition-colors duration-150",
        "aria-pressed:border-green-600 aria-pressed:bg-green-300",
        "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
        selected && "motion-safe:animate-[chip-pop_0.34s_ease-out]",
        className
      )}
      {...props}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center">{icon}</span>
      ) : null}
      <span>{children}</span>
      {/* Selected cue — a hand-drawn check, so selection is never colour-alone. */}
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "size-4 shrink-0 text-brand-deep transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0"
        )}
      >
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </button>
  )
}

export { ChoiceChip }
