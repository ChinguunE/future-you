"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Segmented — a pill-track toggle for short / medium / long choices (DESIGN §12:
 * the horizon control that recasts the time-sensitive charts). Built on Radix
 * ToggleGroup so keyboard + roving focus come for free.
 *
 * The active segment is a raised white pill (background + soft shadow), not just
 * a colour change, so the selected state never relies on colour alone (DESIGN
 * §11). Use as a single-select group: `<Segmented type="single" value=… />`.
 */
function Segmented({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="segmented"
      className={cn(
        "inline-flex h-12 w-fit items-center gap-1 rounded-pill bg-muted p-1",
        className
      )}
      {...props}
    />
  )
}

function SegmentedItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="segmented-item"
      className={cn(
        "inline-flex h-10 min-w-16 cursor-pointer items-center justify-center rounded-pill px-4 text-sm font-bold whitespace-nowrap text-text transition-colors select-none",
        "hover:text-ink",
        "data-[state=on]:bg-white data-[state=on]:text-ink data-[state=on]:shadow-[var(--shadow-card)]",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Segmented, SegmentedItem }
