import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — a small label or counter (DESIGN §13: the list-card "10" / "30+"
 * counters on Learn / Research menus). Tonal badges put --ink on a solid accent
 * (the same AA-safe pairing as the button light fills: coral 5.06 · gold 7.28 ·
 * sky 6.34 · grape 5.67 · green-300 8.22). The `count` tone is the red circular
 * counter — white on --neg at 5.51:1, with tabular figures so "10" and "30+"
 * stay the same width.
 */
const badgeVariants = cva(
  "inline-flex h-6 items-center justify-center gap-1 rounded-pill px-2.5 text-xs font-bold whitespace-nowrap select-none",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-text",
        brand: "bg-green-300 text-ink",
        coral: "bg-coral text-ink",
        gold: "bg-gold text-ink",
        sky: "bg-sky text-ink",
        grape: "bg-grape text-ink",
        count: "nums min-w-6 bg-neg px-1.5 text-white tabular-nums",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
