"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import { ResponsiveTreeMap } from "@nivo/treemap"

import { chartTheme } from "@/lib/chart-theme"
import { useTokenColors } from "@/lib/use-token-colors"
import type { MixNode, Sleeve } from "@/app/[locale]/charts-demo/allocation-data"
import {
  ChartTooltipCard,
  ChartTooltipRow,
  TooltipSwatch,
} from "@/components/charts/chart-tooltip"

/**
 * AllocationTreemapChart (DESIGN §12 "Your mix"). Every holding as a tile sized by the
 * chosen metric — by MONEY (weight) or by RISK (its share of total portfolio risk).
 * The parent owns the metric toggle and passes the matching tree, so the tiles
 * visibly reshuffle: a small-money / big-risk holding (a high-beta pick) tells the
 * honest story that weight ≠ risk. Tiles are sleeve-hued with a glossy sheen + white
 * gaps; the label colour is chosen by luminance so it always clears AA, and the exact
 * figure lives in the tooltip + the "view as table" fallback (§11). Colours resolve
 * live from the design tokens (nivo needs real values; non-negotiable #3).
 */

export type AllocationTreemapChartProps = {
  /** a flat tree: root → one leaf per holding, already sized for the chosen metric */
  data: MixNode
  /** row label in the hover tooltip, e.g. "Share of your mix" or "Share of total risk" */
  shareLabel: string
  /** formats a 0..1 value as a percent (locale-aware) */
  formatShare: (value: number) => string
  ariaLabel: string
}

const SLEEVE_VARS = Object.values(chartTheme.sleeveVar)

/** Parse "#RRGGBB" or "rgb(r,g,b)" → [r,g,b] 0..255 (nivo returns computed hex). */
function parseRgb(color: string): [number, number, number] | null {
  const hex = color.trim()
  if (hex.startsWith("#") && hex.length >= 7) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]
  }
  const m = hex.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const [r, g, b] = m[1].split(",").map((p) => parseFloat(p))
    return [r, g, b]
  }
  return null
}

/** WCAG relative luminance (0 dark → 1 light). */
function luminance(color: string): number {
  const rgb = parseRgb(color)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function AllocationTreemapChart({
  data,
  shareLabel,
  formatShare,
  ariaLabel,
}: AllocationTreemapChartProps) {
  const reduced = useReducedMotion()
  const colors = useTokenColors([...SLEEVE_VARS, "--white", "--ink"])
  const ready = Boolean(colors["--white"])

  const sleeveHex = (sleeve: Sleeve) => colors[chartTheme.sleeveVar[sleeve]] || ""

  // Ink on light tiles, white on dark tiles — chosen by the tile's luminance so a
  // label always clears AA regardless of which accent hue it sits on.
  const readable = (bg: string) =>
    luminance(bg) > 0.34 ? colors["--ink"] : colors["--white"]

  // One glossy vertical sheen per sleeve (matches the donut wedges), applied by a
  // fill rule so each tile reads dimensional rather than flat.
  const SLEEVES: Sleeve[] = ["equity", "bond", "cash", "diversifier"]
  const defs = SLEEVES.map((sleeve) => ({
    id: `gloss-${sleeve}`,
    type: "linearGradient" as const,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    // Bottom stop kept fairly saturated (0.92, not the donut's thinner 0.8 arc fade)
    // so a white label on the dark equity tile clears AA across the whole tile, not
    // just where it's centred — the tiles are large fills that carry text.
    colors: [
      { offset: 0, color: sleeveHex(sleeve), opacity: 1 },
      { offset: 100, color: sleeveHex(sleeve), opacity: 0.92 },
    ],
  }))
  const fill = SLEEVES.map((sleeve) => ({
    match: (node: { data: MixNode }) => node.data.sleeve === sleeve,
    id: `gloss-${sleeve}`,
  }))

  return (
    <div
      className="nums h-[340px] w-full sm:h-[320px]"
      role="group"
      aria-label={ariaLabel}
    >
      {ready ? (
        <ResponsiveTreeMap
          data={data}
          identity="id"
          value="value"
          leavesOnly
          innerPadding={3}
          outerPadding={0}
          enableParentLabel={false}
          label={(node: { id: string | number }) => String(node.id)}
          orientLabel={false}
          labelSkipSize={22}
          labelTextColor={(node: { color: string }) => readable(node.color)}
          colors={(node: { data: MixNode }) => sleeveHex(node.data.sleeve)}
          borderWidth={2}
          borderColor={colors["--white"]}
          nodeOpacity={1}
          defs={defs}
          fill={fill}
          isInteractive
          // Presentational <svg>: the wrapper div names the region and the table is the
          // accessible fallback (nivo would otherwise emit an unlabelled role="img").
          role="presentation"
          animate={!reduced}
          motionConfig="gentle"
          theme={{
            text: { fontFamily: "var(--font-nunito)" },
            labels: { text: { fontWeight: 700, fontSize: 13 } },
            tooltip: {
              container: { background: "transparent", boxShadow: "none", padding: 0 },
            },
          }}
          tooltip={({
            node,
          }: {
            node: { id: string | number; value: number; data: MixNode }
          }) => (
            <ChartTooltipCard title={node.id}>
              <ChartTooltipRow
                swatch={
                  <TooltipSwatch
                    color={chartTheme.sleeveColor[node.data.sleeve]}
                    shape="band"
                  />
                }
                label={shareLabel}
                value={formatShare(node.value)}
              />
            </ChartTooltipCard>
          )}
        />
      ) : null}
    </div>
  )
}
