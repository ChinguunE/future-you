"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Tabs (DESIGN §5/§12) — re-skinned from the raw shadcn scaffold onto our tokens.
 * Two looks:
 *   • default → a pill track (muted background) whose active tab is a RAISED
 *     white pill with the soft card shadow — same recipe as the segmented control,
 *     so the selected state never relies on colour alone (DESIGN §11).
 *   • line    → a quiet underline for in-content section tabs; the active tab
 *     gains an ink label and a green underline bar (a shape cue, not colour-only).
 *
 * Radix handles roving arrow-key focus and aria wiring; the visible focus ring is
 * the global 3px --green-700 one. Tab labels use Baloo 2 to match the brand.
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center",
  {
    variants: {
      variant: {
        default: "gap-1 rounded-pill bg-muted p-1",
        line: "gap-1 border-b border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 font-display text-small font-bold whitespace-nowrap text-text transition-colors select-none hover:text-ink disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // default → raised white pill
        "group-data-[variant=default]/tabs-list:min-h-9 group-data-[variant=default]/tabs-list:rounded-pill group-data-[variant=default]/tabs-list:px-4 group-data-[variant=default]/tabs-list:data-active:bg-white group-data-[variant=default]/tabs-list:data-active:text-ink group-data-[variant=default]/tabs-list:data-active:shadow-[var(--shadow-card)]",
        // line → underline bar
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:px-3 group-data-[variant=line]/tabs-list:py-2 group-data-[variant=line]/tabs-list:data-active:border-brand group-data-[variant=line]/tabs-list:data-active:text-ink",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("text-body text-text outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
