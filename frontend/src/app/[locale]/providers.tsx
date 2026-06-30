"use client"

import type {ReactNode} from "react"

import {TooltipProvider} from "@/components/ui/tooltip"

/**
 * Client providers mounted once, as deep as practical, inside the (server)
 * LocaleLayout. A single Tooltip.Provider shares the open/close delay across
 * every tooltip — the intended Radix pattern — and must live behind a client
 * boundary because React context isn't available in Server Components.
 */
export function Providers({children}: {children: ReactNode}) {
  return <TooltipProvider>{children}</TooltipProvider>
}
