"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import { ResponsiveSunburst } from "@nivo/sunburst"

import { chartTheme } from "@/lib/chart-theme"
import { useTokenColors } from "@/lib/use-token-colors"
import type { MixNode, Sleeve } from "@/app/[locale]/charts-demo/allocation-data"
import {
  ChartTooltipCard,
  ChartTooltipRow,
  TooltipSwatch,
} from "@/components/charts/chart-tooltip"

/**
 * AllocationSunburstChart (DESIGN §12 "Your mix"). Where each franc really sits, as
 * three nested rings: sleeve → asset class → holding. Colour is the sleeve hue,
 * stepping LIGHTER outward (luminance carries the level, not just hue), and every arc
 * is separated by a white hairline. There are no on-arc text labels on purpose — text
 * can't clear AA across four accent hues — so the level names live in the hover
 * tooltip, the card legend, and the full "view as table" hierarchy (§11). Fully
 * prop-driven; nivo needs resolved colours (it computes ring shades), which we read
 * live from the design tokens rather than hard-coding (non-negotiable #3).
 */

export type AllocationSunburstChartProps = {
  data: MixNode
  /** row label in the hover tooltip, e.g. "Share of your mix" */
  shareLabel: string
  /** formats a 0..1 weight as a percent (locale-aware) */
  formatShare: (value: number) => string
  ariaLabel: string
}

// nivo hands the colour/tooltip callbacks a computed datum whose `.data` is our node.
// `id` is nivo's DatumId (string | number); ours are always strings.
type SunburstDatum = {
  id: string | number
  value: number
  data: MixNode
}

const SLEEVE_VARS = Object.values(chartTheme.sleeveVar)

export function AllocationSunburstChart({
  data,
  shareLabel,
  formatShare,
  ariaLabel,
}: AllocationSunburstChartProps) {
  const reduced = useReducedMotion()
  const colors = useTokenColors([...SLEEVE_VARS, "--white", "--ink"])

  const sleeveHex = React.useCallback(
    (sleeve: Sleeve) => colors[chartTheme.sleeveVar[sleeve]] || "",
    [colors]
  )

  // Resolve after mount (nivo measures + renders post-mount anyway). Guard so nivo
  // never receives an unparseable empty colour on the very first client tick.
  const ready = Boolean(colors["--white"])

  return (
    <div
      className="nums h-[340px] w-full sm:h-[320px]"
      role="group"
      aria-label={ariaLabel}
    >
      {ready ? (
        <ResponsiveSunburst
          data={data}
          id="id"
          value="value"
          cornerRadius={3}
          borderWidth={2}
          borderColor={colors["--white"]}
          // Top-level arcs take their sleeve hue; children inherit it and step lighter
          // per ring (the "15–20% lighter per level" convention), so depth reads by
          // luminance as well as radius.
          colors={(node: SunburstDatum) => sleeveHex(node.data.sleeve)}
          inheritColorFromParent
          childColor={{ from: "color", modifiers: [["brighter", 0.4]] }}
          enableArcLabels={false}
          isInteractive
          // The wrapping div is the named region (role="group" + aria-label), and the
          // accessible path is the "view as table" fallback — so nivo's own <svg> is
          // presentational (else it defaults to an unlabelled role="img", failing axe).
          role="presentation"
          animate={!reduced}
          motionConfig="gentle"
          theme={{
            text: { fontFamily: "var(--font-nunito)", fill: colors["--ink"] },
            tooltip: {
              container: { background: "transparent", boxShadow: "none", padding: 0 },
            },
          }}
          tooltip={(node: SunburstDatum) => (
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
