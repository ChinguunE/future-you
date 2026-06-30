import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/**
 * MoneyField — a numeric CHF amount field (DESIGN §3: tabular lining figures so
 * digits line up). A currency prefix sits inside the field's left padding, so the
 * global focus ring still wraps the whole control. The prefix is decorative
 * (`aria-hidden`); pair the field with a <Label> that names the amount and its
 * currency for assistive tech.
 *
 * Presentational: the parent owns the value. `inputMode="decimal"` brings up the
 * number keypad on mobile; the type stays text so locale grouping (e.g. the Swiss
 * 12'500) is allowed.
 */
export interface MoneyFieldProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** The currency shown as the prefix. Default CHF. */
  currency?: string
}

function MoneyField({
  currency = "CHF",
  className,
  ...props
}: MoneyFieldProps) {
  return (
    <div data-slot="money-field" className="relative w-full">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-text-muted select-none"
      >
        {currency}
      </span>
      <Input
        inputMode="decimal"
        className={cn(
          "nums pl-[3.4rem] text-right font-bold tabular-nums",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { MoneyField }
