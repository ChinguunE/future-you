"use client"

import * as React from "react"
import Link from "next/link"

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * GlossaryTerm (DESIGN §5) — any jargon word renders as a subtly dotted,
 * tappable token; tapping (or Enter/Space) opens a Popover with a one-sentence
 * plain-language definition + a "Learn more" link to the future glossary page.
 *
 * The token is a REAL <button> so it is keyboard-operable and announced as a
 * control; its accessible name is the word plus an sr-only hint ("… — show
 * definition"). The dotted underline (not colour) is the affordance, so the cue
 * never relies on colour alone. Radix Popover handles Escape / outside-click
 * dismissal and returns focus to the token. The word itself stays inline in the
 * running text, so it reads as prose, not a widget.
 */
export type GlossaryTermProps = {
  /** the word (popover heading + accessible label); also the fallback token text */
  term: string
  /** the one-sentence plain-language definition */
  definition: React.ReactNode
  /** the "Learn more" link label */
  learnMoreLabel: string
  /** where "Learn more" points — the future glossary page (placeholder for now) */
  learnMoreHref: string
  /** sr-only hint appended to the token's accessible name (e.g. "show definition") */
  defineHint: string
  /** the visible token text (defaults to `term`) — usually the word in-sentence */
  children?: React.ReactNode
  className?: string
}

function GlossaryTerm({
  term,
  definition,
  learnMoreLabel,
  learnMoreHref,
  defineHint,
  children,
  className
}: GlossaryTermProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="glossary-term"
          className={cn(
            "cursor-pointer rounded-[3px] font-semibold text-ink underline decoration-brand-deep/60 decoration-dotted decoration-2 underline-offset-[3px] transition-colors hover:bg-green-300/40 hover:decoration-brand-deep data-[state=open]:bg-green-300/50 data-[state=open]:decoration-brand-deep",
            className
          )}
        >
          {children ?? term}
          <span className="sr-only"> — {defineHint}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label={term} className="space-y-2">
        <p className="font-display text-body-lg font-bold text-ink">{term}</p>
        <p className="text-body text-text">{definition}</p>
        <Link
          href={learnMoreHref}
          className="inline-flex min-h-12 items-center font-bold text-brand-deep underline underline-offset-2 hover:no-underline"
        >
          {learnMoreLabel}
          <span aria-hidden className="ml-1">
            →
          </span>
        </Link>
      </PopoverContent>
    </Popover>
  )
}

export { GlossaryTerm }
