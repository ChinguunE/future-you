import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input — a friendly, chunky text field (DESIGN §3–4): 48px tall, 16px radius, a
 * 2px border that turns brand-green on focus. The visible focus ring comes from
 * the global `:focus-visible` rule (3px --green-700, AA on light). Numeric fields
 * should add `tabular-nums` (the MoneyField does this for you).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-lg border-2 border-input bg-white px-4 text-base text-ink transition-colors",
        "placeholder:font-medium placeholder:text-text-muted",
        "hover:border-foreground/30 focus-visible:border-green-600",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-invalid:border-neg",
        className
      )}
      {...props}
    />
  )
}

export { Input }
