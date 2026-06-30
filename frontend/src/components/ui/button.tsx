import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * The signature pressable button (DESIGN §4) — our one tactile move, in our
 * palette. A hard 4px bottom-shadow (no blur) gives it depth; on :active it
 * sinks flat (translateY 4px + the shadow collapses to 0). The press is a real
 * CSS transition, so the global `prefers-reduced-motion` rule in globals.css
 * makes the sink INSTANT for users who ask for less motion — the state still
 * changes, just without the 80ms ease.
 *
 * Accessibility — the catch of this slice. Every label clears WCAG-AA at normal
 * text strength (a 18px/700 label sits just under the "large bold" threshold, so
 * 4.5:1 is required, not 3:1):
 *   • dark fills  → WHITE label   green-600 5.22:1 · ink 14.12:1 · neg 5.51:1
 *   • light fills → --ink label   coral 5.06:1 · gold 7.28:1 · sky 6.34:1 · grape 5.67:1
 *   • secondary / ghost / link    green-700 text  6.39:1 white · 5.97:1 paper
 * The edge tone is decorative (never text), so it carries no contrast bar.
 *
 * The component stays server-renderable (the press is pure CSS), so landing-page
 * CTAs can use it without a client boundary.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2",
    "rounded-lg border border-transparent bg-clip-padding font-display font-bold leading-none whitespace-nowrap select-none",
    "[--btn-edge:transparent] shadow-[0_4px_0_var(--btn-edge)]",
    "transition-[transform,box-shadow,filter] duration-[80ms] ease-out",
    "active:translate-y-1 active:shadow-[0_0_0_var(--btn-edge)]",
    "disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        // Dark fills → white label.
        primary:
          "bg-green-600 text-white [--btn-edge:var(--green-800)] hover:brightness-[1.04]",
        ink: "bg-ink text-white [--btn-edge:var(--ink-shadow)] hover:brightness-[1.18]",
        destructive:
          "bg-neg text-white [--btn-edge:var(--neg-shadow)] hover:brightness-[1.05]",
        // Light fills → --ink label.
        coral:
          "bg-coral text-ink [--btn-edge:var(--coral-shadow)] hover:brightness-[1.04]",
        gold: "bg-gold text-ink [--btn-edge:var(--gold-shadow)] hover:brightness-[1.04]",
        sky: "bg-sky text-ink [--btn-edge:var(--sky-shadow)] hover:brightness-[1.04]",
        grape:
          "bg-grape text-ink [--btn-edge:var(--grape-shadow)] hover:brightness-[1.04]",
        // White outline → green-700 label, grey edge (DESIGN §4 secondary).
        secondary:
          "bg-white text-brand-deep border-2 border-green-600 [--btn-edge:var(--button-secondary-shadow)] hover:bg-green-300/30",
        // `outline` is the shadcn name some primitives (Dialog) ask for — same look.
        outline:
          "bg-white text-brand-deep border-2 border-green-600 [--btn-edge:var(--button-secondary-shadow)] hover:bg-green-300/30",
        // Flat affordances — no 3D edge.
        ghost:
          "text-brand-deep shadow-none hover:bg-green-300/30 active:translate-y-0 active:shadow-none",
        link: "text-brand-deep underline-offset-4 shadow-none hover:underline active:translate-y-0 active:shadow-none",
      },
      size: {
        // ≥48px primary tap targets (DESIGN §4 / §11).
        default: "min-h-12 rounded-lg px-6 text-[1.125rem]",
        sm: "min-h-11 rounded-md px-4 text-[0.95rem]",
        lg: "min-h-14 rounded-lg px-8 text-xl",
        icon: "size-12 px-0",
        "icon-sm":
          "size-10 rounded-md px-0 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
