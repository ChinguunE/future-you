"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Tooltip — a small ink bubble with paper text (ink #14302B on paper is ~13:1,
 * comfortably AA). Re-skinned from the raw shadcn scaffold onto our tokens.
 * Radix makes it keyboard-reachable (it opens on focus, not hover-only) and
 * Escape-dismissable. The slide+fade collapses to instant under reduced motion
 * via the global media query.
 *
 * Note: a tooltip is for short, non-essential hints. The glossary "tap to define"
 * pattern (DESIGN §5) is a separate, mobile-reachable popover landing in Phase 5.
 */
function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-md bg-ink px-3 py-1.5 text-small font-semibold text-paper shadow-[var(--shadow-card)]",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-ink fill-ink" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
