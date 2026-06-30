"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Accordion — the "show the maths" disclosure (DESIGN §5): equation blocks and
 * concept explainers stay collapsed behind a toggle and open on tap. Each item
 * is a soft white card (our content unit) with a Baloo 2 trigger and a chevron
 * that rotates when open.
 *
 * Radix gives the WAI-ARIA pattern for free — aria-expanded / aria-controls on
 * the trigger, Enter/Space to toggle, arrow keys between headers — and is
 * SSR-safe (uncontrolled by default). The height animation uses the
 * --radix-accordion-content-height var; it collapses to instant under
 * prefers-reduced-motion via the global media query in globals.css.
 */
function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-white shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/acc flex flex-1 cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-display text-body-lg font-bold text-ink transition-colors outline-none hover:bg-muted/60",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden
          className="size-5 shrink-0 text-brand-deep transition-transform duration-200 group-data-[state=open]/acc:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-body text-text data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div className={cn("px-5 pt-0 pb-5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
