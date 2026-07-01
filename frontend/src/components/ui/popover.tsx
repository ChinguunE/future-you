"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Popover (DESIGN §5 "Glossary term … opens a popover with a one-sentence plain
 * definition") — a small white card that floats over the page on click/keyboard
 * (NOT hover), the mobile-reachable "tap to define" affordance the tooltip note
 * deliberately deferred. Re-skinned from the raw shadcn scaffold onto our tokens:
 * white --popover surface, hairline --border ring, soft --shadow-card, Nunito body.
 *
 * Accessibility comes from Radix: it opens on click / Enter / Space, closes on
 * Escape OR an outside click, and returns focus to the trigger on close. The
 * visible focus ring is the global 3px --green-700 one (globals.css). The
 * zoom+fade collapses to instant under prefers-reduced-motion via the global
 * media query — nothing to gate here.
 */
function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-50 w-72 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) rounded-lg bg-popover p-4 text-popover-foreground shadow-[var(--shadow-card)] ring-1 ring-border outline-none",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger }
