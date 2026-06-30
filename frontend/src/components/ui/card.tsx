import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Card — the unit of content (DESIGN §5): white, 16px radius, a soft shadow and
 * generous padding. Tones tint the surface with a soft wash of an accent (the
 * recipe lives in globals.css so no colour is hard-coded), and the one
 * `highlight` tone is the single dark gradient card a page may use (DESIGN §13:
 * ink → deep grape, white text, a white pill CTA).
 *
 * Children inherit the card's text colour, so CardTitle / CardDescription stay
 * AA on both the light surfaces (--ink) and the dark highlight (white).
 */
const cardVariants = cva(
  "group/card flex flex-col gap-3 rounded-lg p-6 text-base",
  {
    variants: {
      tone: {
        default:
          "bg-card text-card-foreground shadow-[var(--shadow-card)] ring-1 ring-foreground/8",
        sky: "bg-[var(--card-sky-bg)] text-ink ring-1 ring-[var(--card-sky-edge)]",
        grape:
          "bg-[var(--card-grape-bg)] text-ink ring-1 ring-[var(--card-grape-edge)]",
        coral:
          "bg-[var(--card-coral-bg)] text-ink ring-1 ring-[var(--card-coral-edge)]",
        highlight:
          "bg-gradient-to-br from-[var(--highlight-from)] to-[var(--highlight-to)] text-white shadow-[var(--shadow-card)]",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

function Card({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-tone={tone}
      className={cn(cardVariants({ tone }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-display text-h3 leading-tight font-bold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm opacity-80", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn(className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 pt-1", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
