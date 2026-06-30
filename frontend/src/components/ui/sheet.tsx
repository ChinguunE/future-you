"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Dialog as SheetPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Sheet — an edge-anchored overlay built on Radix Dialog (vaul isn't installed,
 * and Dialog already gives us focus-trap / Escape / scroll-lock / aria-modal).
 * The headline case (DESIGN §13) is the MOBILE bottom sheet: "secondary menus
 * open as a rounded bottom sheet over a dimmed backdrop." It rises from the
 * bottom over the same ink scrim as the Dialog, with rounded top corners and a
 * small grab handle for affordance.
 *
 * `side` (cva) also supports top / left / right for the app shell later. The
 * slide animations collapse to instant under prefers-reduced-motion via the
 * global media query in globals.css; the visible focus ring is the global one.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-scrim duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const sheetVariants = cva(
  [
    "fixed z-50 flex flex-col gap-4 bg-popover p-6 text-popover-foreground shadow-[var(--shadow-card)] duration-300 outline-none",
    "data-open:animate-in data-closed:animate-out",
  ],
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 w-full rounded-t-xl border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))] data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
        top: "inset-x-0 top-0 w-full rounded-b-xl border-b border-border data-open:slide-in-from-top data-closed:slide-out-to-top",
        right:
          "inset-y-0 right-0 h-full w-3/4 max-w-sm rounded-l-xl border-l border-border data-open:slide-in-from-right data-closed:slide-out-to-right",
        left: "inset-y-0 left-0 h-full w-3/4 max-w-sm rounded-r-xl border-r border-border data-open:slide-in-from-left data-closed:slide-out-to-left",
      },
    },
    defaultVariants: {
      side: "bottom",
    },
  }
)

function SheetContent({
  className,
  children,
  side = "bottom",
  showCloseButton = true,
  showHandle = true,
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    showCloseButton?: boolean
    showHandle?: boolean
    closeLabel?: string
  }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {showHandle && side === "bottom" && (
          <div
            aria-hidden
            className="mx-auto -mt-2 mb-1 h-1.5 w-9 rounded-pill bg-border"
          />
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3">
              <XIcon />
              <span className="sr-only">{closeLabel}</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-2 flex flex-col gap-3", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-h3 font-display text-ink", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body text-text-muted", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
