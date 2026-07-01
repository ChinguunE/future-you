import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table (DESIGN §5 "Cards"/§12 "Tables — first-class") — a plain, legible data
 * table: tabular lining numerals (th/td inherit them from globals.css so columns
 * align), hairline row borders, a soft header band, and rounded outer corners.
 *
 * Mobile-first sizing: a smaller font + tighter cells on phones, the fuller size
 * from `sm:` up. The table lives in a scroll region so a wide table is never
 * hard-clipped (DESIGN §12 "never a hard clip") — it scrolls, with a soft
 * right-edge fade cue on narrow screens. Pass `wrapperClassName` to bound the
 * region (e.g. a capped height with a sticky header) per surface.
 *
 * It is the chart card's "View as table" fallback (the accessibility path, DESIGN
 * §12) and the base for the Phase-5 holdings table. Tokens only. Right-align a
 * numeric column by passing `className="text-right"` to its TableHead + TableCell.
 */

function Table({
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<"table"> & { wrapperClassName?: string }) {
  return (
    <div data-slot="table-scroll" className="relative">
      {/* The scroll region — focusable so a wide/tall table is keyboard-reachable
          (WCAG 2.1 SC 2.1.1 scrollable-region-focusable). */}
      <div
        data-slot="table-wrapper"
        tabIndex={0}
        className={cn(
          "w-full overflow-x-auto rounded-lg ring-1 ring-border",
          wrapperClassName
        )}
      >
        <table
          data-slot="table"
          className={cn(
            "w-full caption-bottom border-collapse text-small sm:text-body",
            className
          )}
          {...props}
        />
      </div>
      {/* Right-edge fade cue on narrow screens — signals "more this way", never a
          hard clip. Hidden from sm: up, where the table has room. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-lg bg-gradient-to-l from-card to-transparent sm:hidden"
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/60", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border last:border-0 hover:bg-muted/40",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        "px-3 py-2.5 text-left align-middle text-small font-bold text-ink sm:px-4 sm:py-3",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-2.5 align-middle text-text sm:px-4 sm:py-3", className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 px-1 text-left text-small text-text-muted", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
