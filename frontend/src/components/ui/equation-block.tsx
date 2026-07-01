"use client"

import * as React from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

/**
 * EquationBlock (DESIGN §5 "Equation block (KaTeX)") — the "show the maths"
 * teaching primitive. Plain language FIRST: the result is stated in words, then a
 * "Show the maths" toggle (the reused Slice-4 Accordion, COLLAPSED by default)
 * reveals a soft --paper card holding the formula cleanly typeset in KaTeX, each
 * symbol defined in plain words (the Guidebook stacked-rows feel), a worked
 * example using real numbers, and a one-line "why this works".
 *
 * The chart "Show the details / maths" toggle (DESIGN §12) reuses this same block,
 * so it is fully prop-driven and self-contained — no i18n or data lives here.
 *
 * Accessibility: the Accordion trigger exposes aria-expanded / aria-controls
 * (Radix); KaTeX renders MathML alongside the (aria-hidden) visual HTML so every
 * formula has a machine-readable form, and each formula additionally carries an
 * sr-only plain-language reading via <figcaption>. The height animation collapses
 * to instant under prefers-reduced-motion (global media query in globals.css).
 */

export type EquationSymbol = {
  /** the symbol as a TeX fragment (e.g. "FV", "r", "n") — typeset inline to match the formula */
  tex: string
  /** its meaning, in plain words */
  meaning: React.ReactNode
}

export type EquationBlockProps = {
  /** the plain-language result, stated first (before the toggle) */
  result: React.ReactNode
  /** the toggle label (e.g. "Show the maths") */
  showMathsLabel: string
  /** the clean symbolic formula, as a TeX string (block display) */
  formula: string
  /** an sr-only plain-language reading of the formula (the accessible "alt") */
  formulaAlt: string
  /** small heading above the symbol rows (e.g. "What each part means") */
  symbolsLabel: string
  /** the Guidebook-style symbol rows */
  symbols: EquationSymbol[]
  /** small heading above the worked example (e.g. "With your numbers") */
  exampleLabel: string
  /** the worked example, as a TeX string (numbers substituted, block display) */
  exampleFormula: string
  /** an sr-only reading of the worked example */
  exampleAlt: string
  /** a plain-language caption under the worked example */
  exampleCaption: React.ReactNode
  /** small heading above the "why" line (e.g. "Why this works") */
  whyLabel: string
  /** the one-line "why this works" */
  why: React.ReactNode
  /**
   * An optional decorative flourish shown at the top of the maths card when it
   * opens — a warm reward for curiosity (the demo passes a small Sprout). It
   * scales in gently on expand (reduced-motion → instant) and MUST be decorative
   * (aria-hidden) so it never touches the formula's accessible name. Omit it and
   * the block renders without one — so chart reuse (§12) stays uncluttered.
   */
  reward?: React.ReactNode
  className?: string
}

const KATEX_OPTS = {
  throwOnError: false,
  strict: "ignore" as const,
  output: "htmlAndMathml" as const
}

function useKatex(tex: string, displayMode: boolean) {
  // Pure string generation (no DOM) — safe on the server render and the client;
  // the same input yields the same HTML, so hydration never mismatches.
  return React.useMemo(
    () => katex.renderToString(tex, { ...KATEX_OPTS, displayMode }),
    [tex, displayMode]
  )
}

const EYEBROW = "text-xs font-bold uppercase tracking-wide text-brand-deep"

// The smallest we shrink a formula before letting it scroll instead. A short
// formula fits well above this; only a genuinely long line hits the floor and
// then scrolls (with the edge fade as the cue).
const MIN_FONT_SCALE = 0.72

// Run before paint on the client (so the first painted frame is already fitted,
// never a clipped one) without the SSR "useLayoutEffect does nothing" warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

/**
 * Fit a block formula to its container: measure natural width vs available width
 * and, only if it overflows, shrink the KaTeX font just enough to fit — down to
 * MIN_FONT_SCALE, past which it stays scrollable. Desktop formulas already fit,
 * so nothing changes there; this only rescues narrow viewports. Re-fits when the
 * KaTeX web fonts load (their metrics change the width) and when the container
 * width changes (rotation / resize).
 */
function useFitToWidth(
  ref: React.RefObject<HTMLDivElement | null>,
  key: string
) {
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let lastWidth = -1
    const fit = (force = false) => {
      const node = ref.current
      if (!node) return
      const width = node.clientWidth
      // Width-guard: skip re-fits triggered only by our own height change
      // (avoids a ResizeObserver feedback loop); `force` bypasses it so a
      // fonts-load re-measure still runs.
      if (!force && width === lastWidth) return
      lastWidth = width
      node.style.fontSize = "" // measure at the natural size
      if (node.scrollWidth - node.clientWidth > 1) {
        const scale = Math.max(MIN_FONT_SCALE, node.clientWidth / node.scrollWidth)
        node.style.fontSize = `${scale}em`
      }
    }
    fit(true)
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => fit(true)).catch(() => {})
    }
    const parent = el.parentElement
    let ro: ResizeObserver | undefined
    if (parent && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => fit())
      ro.observe(parent)
    }
    return () => ro?.disconnect()
  }, [ref, key])
}

/**
 * A KaTeX block formula. role="img" + aria-label gives it a single, plain-language
 * accessible name (a spoken reading of the maths) instead of KaTeX's raw MathML.
 * It fits itself to the container (see useFitToWidth); if it still can't fit at
 * the floor, tabIndex + overflow-x makes it a keyboard-reachable scroll region
 * (WCAG scrollable-region-focusable) and the edge fade signals the scroll.
 */
function Formula({ tex, alt }: { tex: string; alt: string }) {
  const html = useKatex(tex, true)
  const ref = React.useRef<HTMLDivElement>(null)
  useFitToWidth(ref, html)
  return (
    <div
      ref={ref}
      className="equation-formula equation-scroll"
      tabIndex={0}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** A small inline symbol, typeset in KaTeX so it matches the formula. */
function InlineSymbol({ tex }: { tex: string }) {
  const html = useKatex(tex, false)
  return (
    <span className="equation-formula" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

function EquationBlock({
  result,
  showMathsLabel,
  formula,
  formulaAlt,
  symbolsLabel,
  symbols,
  exampleLabel,
  exampleFormula,
  exampleAlt,
  exampleCaption,
  whyLabel,
  why,
  reward,
  className
}: EquationBlockProps) {
  return (
    <div
      data-slot="equation-block"
      className={cn(
        "rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:p-6",
        className
      )}
    >
      {/* Plain language FIRST — the answer in words. */}
      <p className="nums text-body-lg text-ink">{result}</p>

      {/* The "show the maths" toggle — the reused Slice-4 Accordion, collapsed. */}
      <Accordion
        type="single"
        collapsible
        className="mt-3 gap-0 border-t border-border pt-1"
      >
        <AccordionItem
          value="maths"
          className="border-0 bg-transparent shadow-none"
        >
          <AccordionTrigger className="px-0 py-3 text-body-lg text-brand-deep hover:bg-transparent">
            {showMathsLabel}
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            {/* The soft --paper maths card — the sanctioned cream ACCENT (§5). */}
            <div className="space-y-5 rounded-lg bg-paper p-4 ring-1 ring-border sm:p-5">
              {/* A small decorative Sprout rewards opening — scales in on expand
                  (equation-reward keyframe; reduced-motion → instant). */}
              {reward && (
                <div className="equation-reward -mb-3 flex justify-end">
                  {reward}
                </div>
              )}

              {/* (i) the formula, cleanly typeset — on its own white tile */}
              <div className="rounded-md bg-white px-3 py-3 ring-1 ring-border">
                <Formula tex={formula} alt={formulaAlt} />
              </div>

              {/* (ii) each symbol in plain words — Guidebook stacked rows */}
              <div className="space-y-2">
                <p className={EYEBROW}>{symbolsLabel}</p>
                <dl className="space-y-2">
                  {symbols.map((s) => (
                    <div
                      key={s.tex}
                      className="flex items-baseline gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-border"
                    >
                      <dt className="w-10 shrink-0 text-center text-ink">
                        <InlineSymbol tex={s.tex} />
                      </dt>
                      <dd className="flex-1 text-body text-text">{s.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* (iii) a worked example with real numbers */}
              <div className="space-y-2">
                <p className={EYEBROW}>{exampleLabel}</p>
                <div className="rounded-md bg-white px-3 py-3 ring-1 ring-border">
                  <Formula tex={exampleFormula} alt={exampleAlt} />
                  <p className="nums mt-2 text-body text-text">{exampleCaption}</p>
                </div>
              </div>

              {/* (iv) why this works */}
              <div className="space-y-2">
                <p className={EYEBROW}>{whyLabel}</p>
                <p className="rounded-md bg-green-300/25 px-3 py-2 text-body text-ink">
                  {why}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export { EquationBlock }
