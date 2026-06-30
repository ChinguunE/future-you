# Future You — Design System

*Inspiration: **Duolingo**. We borrow its design **language and principles** — the approachable, playful, character-led, bite-sized feel that makes an intimidating subject fun — and express it through **our own palette, our own illustrations (Sprout), and our own name**. We do **not** clone its brand (no Duo owl, no `#58CC02` green, no logo).*

This doc is the contract for the look & feel. Build to these tokens and rules.

---

## 1. North star

Make investing feel like Duolingo makes language-learning feel: **friendly, bold, encouraging, one clear step at a time, and quietly rigorous underneath.** A nervous 15-year-old should feel invited in, not talked down to.

**Borrowed from Duolingo (the four pillars Chinguun chose):**
- **Playful look** — bold colour, big rounded friendly type, chunky *pressable* buttons, lots of rounding.
- **Bite-sized, gamified flow** — one clear action per screen, visible progress, celebratory feedback on wins.
- **Friendly, encouraging tone** — warm, plain microcopy; mistakes feel safe, wins feel good.
- **Character energy** — a companion guides you throughout (our **Sprout**, never Duo).

**Stays ours:** the palette (below, sampled from our illustrations), the 85-piece illustration library, the name *Future You*, no logo.

**One principle we deliberately reject from Duolingo: no dark patterns.** This is a tool for calm, informed money decisions — adopt the encouragement and celebration, but **never** streak-guilt, loss-aversion nagging, or pressure mechanics. Honesty over engagement-at-all-costs.

---

> **⚙️ Build discipline — Skills Protocol (read before any UI work).** Auto-invocation is unreliable, so the design skills are invoked **explicitly, by name, per task**, and Claude Code must **announce** each one:
>
> - Tokens / design system / components → **`frontend-design`** + **`ui-ux-pro-max:design`**
> - Visual styling & polish → **`ui-ux-pro-max:ui-styling`**
> - shadcn components → **`shadcn`**
> - Every screen's build → screenshot → refine loop → **`playwright`**
>
> **Announce + gate:** say "Invoking `<skill>`…" *before* the work; if UI got made without it, that's a process error — redo it. Never design "from memory."
> **Pre-flight (Phase 0):** confirm these are installed (`/plugin`): Frontend Design · UI UX Pro Max · shadcn · Playwright (+ Superpowers). If one's missing, stop and tell me.
> **Bake this block into `CLAUDE.md`** so it loads every session — don't rely on the prompt being re-pasted.

> **📌 Use the written system AND the reference images — together, on every screen.** This doc is the spec; `/inspiration/duolingo/` (web-app · web-landing · ios) is the visual ground-truth. For each screen: **(1)** open the matching reference image(s), **(2)** invoke the design skill (above), **(3)** build to the tokens/components in this doc, **(4)** screenshot and compare against *both*. Neither alone is enough — references without these rules drift off-brand; rules without the references come out generic. (Pattern → screen mapping: §13.)

> **🌐 Bilingual from the start (EN / FR).** The app ships in **English and French** (Geneva). **No hard-coded text** — every string is translatable via **next-intl** with `[locale]` routing (`/en`, `/fr`). Design for it: **French runs ~15–20% longer**, so don't pin widths to English; the body font must carry **full French accents** (Nunito does); format **numbers, dates, and CHF currency per locale**; provide a clear **language toggle**. The AI-generated research, glossary, and all content (DATA.md) are produced and verified in **both** languages.

## 2. Colour tokens

Sampled from the illustration SVGs so UI and art share one world. Anchored on a green→ink scale plus four accents on a warm-cream canvas.

| Token | Hex | Use |
|---|---|---|
| `--green-300` | `#8FD3BE` | light tint, highlighted/active backgrounds — **decorative, never text** (1.72:1) |
| `--green-400` | `#54B49C` | **brand green** — fills, illustration harmony — **decorative, never text** (2.50:1) |
| `--green-500` | `#2E8B6F` | decorative mid-green / chart fill — white text **only** at large+bold (4.17:1) |
| `--green-600` | `#247A5E` | **primary action** fill — white text passes AA at **any** size (5.22:1) |
| `--green-700` | `#1F6B53` | **on-light green text / icon / link / focus** (6.39:1 white · 5.97:1 paper) |
| `--green-800` | `#15543F` | the 3D button bottom-shadow (darkest green) |
| `--ink` | `#14302B` | headings & outlines (matches art's deep teal-charcoal) |
| `--text` | `#33514A` | body text |
| `--text-muted` | `#5E726B` | captions, secondary (AA at 5.13:1; the old `#6B7E78` failed at 4.30:1) |
| `--coral` | `#F07854` | secondary CTA fill / highlight (shadow `#C85A3C`) — **decorative, never text** |
| `--gold` | `#FCA848` | rewards, milestone, attention (shadow `#D98828`) — **decorative, never text** |
| `--sky` | `#6CB4F0` | info / neutral accent **fill** — **decorative, never text or focus ring** (2.23:1) |
| `--grape` | `#9C9CF0` | variety, tertiary accent — **decorative, never text** |
| `--paper` | `#FBF7EC` | warm default background |
| `--white` | `#FFFFFF` | cards, surfaces |
| `--pos` | `#1F6B53` | **gains** text (= `--green-700`; always paired with ▲ / label) |
| `--neg` | `#C0353A` | **losses** text (AA at 5.51:1; the old `#E5484D` failed at 3.91:1; always with ▼ / label) |

> **The two-green AA split.** A single green can't be both a button fill (white text on it) and readable green text on a light surface at WCAG-AA — the old `#2E8B6F` only clears 3:1, so it carried button labels but quietly failed as normal-size text. We split the role: **`--green-600 #247A5E`** is the action **fill** (white text, 5.22:1, AA at any size); **`--green-700 #1F6B53`** is the **on-light text** green (6.39:1 white / 5.97:1 paper). The sampled `#2E8B6F` lives on as `--green-500` for decorative/chart fills only. Every figure above is a verified WCAG 2.1 ratio against `#FFFFFF` and `--paper #FBF7EC`.

**Rules.** Light, clean backgrounds (cream/white) with **bold colour on the actionable things** (Duolingo-style), not a busy background. Money up/down must **never** rely on colour alone — always an arrow or label too. The old baby-blue cloud-sky is *not* the default here; the `sky/` cloud art is optional playful garnish, not a mandatory backdrop.

> **App-shell surface — confirmed Phase 4 Slice 5.5: white base.** The research/dashboard shell uses a **near-white canvas `--canvas #F6F8F7`** behind `#FFFFFF` cards (so the cards still separate from the field with their hairline ring + soft shadow — the reference's crisp white surfaces, never a flat cream field). Colour is carried by the **coral section banner**, **sky/green-tinted cards**, **coloured icon-chips**, and the **one `--ink`→`--grape` gradient** highlight. `--paper` cream stays the **public landing + `/style-guide`** background only, not a large empty field inside the app.

---

## 3. Typography

Duolingo's identity is rounded type (custom *Feather* for headlines + *DIN Next Rounded* for text). We reproduce that feel with **commercial-free, deployable** fonts:

- **Headings / display — `Baloo 2`** (Google Fonts): chunky, rounded, friendly — our Feather analog. Weights 600–800.
- **Body / UI / numbers — `Nunito`** (Google Fonts): rounded, highly legible, excellent numerals — our DIN-Round analog. Use **tabular lining numerals** for all money.
- *Alternatives to audition in the design phase: Fredoka, Varela Round (display); Quicksand, Rubik (body).*

> This **supersedes** the old Chillax + Hanken pairing — those aren't rounded and would fight the Duolingo direction. Final pick gets confirmed with specimens in Phase 4.

**Scale (px / weight):** display 48/800 · h1 32/800 · h2 24/700 · h3 20/700 · body-lg 18/500 · body 16/500 · small 14/600. Generous line-height (1.4–1.6 for body). Headlines tight and bold; body relaxed.

---

## 4. Shape, elevation & the signature button

- **Radii:** `--r-sm 8` · `--r-md 12` · `--r-lg 16` (cards & buttons) · `--r-xl 24` · `--r-pill 999`.
- **Elevation:** surfaces are mostly flat with soft shadows (`0 2px 8px rgba(20,48,43,.08)`). The *one* tactile signature is the button.

**The pressable button (the Duolingo move, in our green):**
```
Primary (rest):  background: var(--green-600);
                 color: #fff; border-radius: 16px;
                 box-shadow: 0 4px 0 var(--green-800);   /* hard, no blur */
                 padding: 14px 24px; min-height: 48px;
                 font: 700 18px "Baloo 2"; 
Primary (active/press): transform: translateY(4px);
                 box-shadow: 0 0 0 var(--green-800);      /* sinks flat */
Secondary:       white fill, 2px var(--green-600) border, var(--green-700) text, same 4px bottom shadow in a grey.
Coral / Gold variants: same mechanic, swap fill + its darker shadow token.
```
Big tap targets (≥48px), one **primary** button per screen, ideally bottom-anchored on mobile.

---

## 5. Components

- **Cards:** white, `--r-lg`, soft shadow, generous padding (20–24px). The unit of content.
- **Choice chips / pills:** rounded, bold, tappable; selected state = `--green-300` tint + `--green-600` border (Duolingo answer-select feel) — used in the risk quiz and "what interests you."
- **Progress:** a thick rounded top progress bar for the guided flow; ring/segment progress for goals. Animated fills.
- **Glossary term:** any jargon word renders as a subtly underlined/dotted tappable token → opens a **popover** with a one-sentence plain definition + "learn more" → glossary page.
- **Equation block (KaTeX):** a soft `--paper` card; the formula cleanly typeset (never inline text); below it, each symbol defined in plain words + a worked example using the user's own numbers; a "why this works" line. Collapsed by default behind a "show the maths" toggle.
- **Chart frame:** white card, `Nunito` labels, our palette, rounded line caps, faint/no gridlines, plain-language tooltip + a "what this tells you" caption. Never default-grey Excel. **Full chart spec in §12.**
- **Modal / sheet:** rounded, centered character optional, single clear action.

---

## 6. Layout & the two modes

The app has two layout modes sharing one visual language:
- **Guided flow** (onboarding, risk quiz, plan reveal): Duolingo-strict — **one clear thing per screen**, big art, big type, one primary button, progress on top, lots of breathing room. Mobile-first.
- **Research / dashboard** (per-stock, per-sector, analytics): richer and denser, but same tokens — cards, rounded, friendly type, clear hierarchy, sections with their own headers and "explain" toggles. Deep-linkable pages.

Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48. Max content width ~720px for flow, wider grids for dashboards.

---

## 7. Motion

Snappy and satisfying, never showy. Button press (the sink), pill-select bounce, smooth page/step transitions (slide+fade ~200–300ms), and **celebratory moments** on milestones (a `mascot/celebrating.svg` + light confetti when a plan is finished or a goal is on track). Characters carry **gentle idle animations** (a soft bob/blink) and the public landing uses a **floating-elements motif** (drifting coins/shapes) with **on-scroll entrance** reveals — tasteful, never busy. **Respect `prefers-reduced-motion`** — drop transforms, confetti, idle loops, and floats; keep instant state changes.

---

## 8. Character system (Sprout)

Sprout is the guide on (nearly) every screen — Duolingo's character energy, our IP. The illustration library already maps poses to moments; use that mapping, e.g.:
- `mascot/arms-out` welcome · `mascot/thinking` risk quiz · `mascot/with-pie-chart` the plan · `mascot/with-magnifier` research/"how risky" · `mascot/growth-arrow` projections · `mascot/reading` glossary/learn · `mascot/relaxing-deckchair` retirement · `mascot/celebrating` / `with-trophy` wins · `mascot/calm` / `riding-wave` reassurance during dips.
Use illustrations **big and with personality** (a recurring past gripe — fix it here). One distinct piece per context; avoid repeating the same pose across a flow.

---

## 9. Gamification — adopt vs avoid

- **Adopt:** visible progress, "you learned X" / "your plan is ready" moments, gentle milestones, celebratory feedback, a sense of momentum.
- **Avoid (deliberately):** streak guilt, daily-nag pressure, loss-aversion manipulation, anything that rushes a money decision. Encouragement, not compulsion.

---

## 10. Voice & tone

Warm, plain, encouraging; a smart 15-year-old's reading level without ever being childish. Lead with the point, then the detail. Celebrate wins simply ("Nice — your safety net is fully funded"). Make caution calm, not scary ("This one swings a lot — here's what that means and a sensible amount to hold"). Define, don't assume.

---

## 11. Accessibility (WCAG-AA, non-negotiable)

- Contrast: body text uses `--ink` (14:1) / `--text` (8.7:1) on light — passes AA. **The two-green AA split (§2):** `--green-400 #54B49C` (2.50:1) and the decorative `--green-500 #2E8B6F` (4.17:1 — large/bold only) **must not carry normal text**; use **`--green-700 #1F6B53`** for any green text/icon/link (6.39:1 white · 5.97:1 paper), and **`--green-600 #247A5E`** as the button fill (white label 5.22:1, AA at any size). The accent fills `--coral`/`--gold`/`--sky`/`--grape` all fail text contrast — fills only, never text. (Every ratio verified WCAG 2.1 vs `#FFFFFF` and `--paper`.)
- Targets ≥48px; visible focus ring (3px `--green-700` with a 2px offset — it clears the 3:1 non-text bar on light, where `--sky` at 2.23:1 would fail SC 1.4.11); full keyboard nav.
- Never colour-alone (gains/losses get arrows/labels; quiz states get icons).
- Honour `prefers-reduced-motion`. Alt text on every illustration (the manifest's description).

---

## 12. Charts, graphs & tables (the analytics layer)

Duolingo has no real data viz, so this is **our own** chart language. Rule: **friendly and clear on the surface, rigorous and honest underneath.** Never the grey Excel default; never "cute" at the cost of accuracy.

**The chart card (every chart uses it):**

- A **plain-language question** as the title ("Will I reach my goal?", "How bumpy is the ride?").
- The chart, themed to our palette — rounded line caps, soft or no gridlines, big readable labels, our colours.
- A one-line **"What this tells you"** caption in plain words.
- An optional **"Show the details / maths"** toggle → the numbers + the KaTeX formula (per §5).
- **Plain-language tooltips** (words, not codes) and **on-chart annotations/markers** ("you are here", "your goal", "a rough year").
- A **"View as table"** fallback (also the accessibility path).

**The catalogue — grouped by what it explains** (each works across a short ▸ medium ▸ long horizon):

- **Your mix:** donut + **sunburst** (asset class → sleeve → holding), **treemap** (every holding sized by weight or risk), **stacked bar** comparing *your mix* vs *the optimal mix* (the recommend-with-you trade-off).
- **Your growth:** **Monte-Carlo fan/cone** (median + shaded p10–p90 bands — a range of futures, not one false line), **goal-funding probability** ("≈78% chance of CHF X by 2040"), **contributions-vs-growth** stacked area.
- **Your risk:** **drawdown** underwater plot (the stomach test), **return distribution** with the bad-month **VaR/CVaR** tail shaded, **correlation heatmap**, **risk-contribution bars** (who drives the wobble), **efficient-frontier scatter** with a "you are here" dot.
- **Per stock / sector:** **price history** line/area with range selector (1M·6M·1Y·5Y·Max; candlestick only behind an "advanced" toggle), **fundamentals bars** (revenue/earnings trend), **valuation vs peers**, **analyst price-target range** (low–mean–high marker).
- **Scenario & comparison:** **stress bars** (how the plan fares in 2008 / 2020 / a rate shock), **rolling returns**, **benchmark** comparison lines.
- **Tables (first-class):** sortable **holdings table** (weight · role · risk · sector) with tiny **sparklines**; **sector-exposure** and **dividend-income** tables. Tabular numerals, aligned, plain headers.

**Horizon control:** a short / medium / long **segmented toggle** recasts the time-sensitive charts — same data, your timeframe.

**Honest by construction (accuracy is sacred):** never truncate or zoom an axis to exaggerate; show ranges/bands, not false-precision single lines; **colour-blind-safe** palette and **never colour-alone** (gains/losses use `--pos`/`--neg` + ▲▼ and labels); always an alt text + "view as table".

**Feel & motion:** rounded bars/caps, our palette, big labels; charts **draw/grow in** quickly on entry (reduced-motion → instant). A character can punctuate the insight — `mascot/with-pie-chart` beside the allocation, `mascot/calm` next to a scary-looking drawdown to reassure.

**Tech:** **Recharts** as primary (composable React, themes cleanly to our tokens) for line/area/bar/scatter/donut; **nivo** or **ECharts** for the few it doesn't do well (treemap, sunburst, heatmap). One shared chart-theme file (colours, fonts, radii) so every chart matches.

**Consistency is enforced, not hoped for.** Charts read the **same design tokens** (§2–§4) through that single chart-theme file — *no hard-coded colours, fonts, or radii in chart code* — and every chart is wrapped in the shared **chart-card** (§5), so it inherits the app's palette, type, spacing, motion, and tooltip style automatically. The chart-card and chart-theme are the only sanctioned way to render a chart; a chart that bypasses them (or whose colours drift) fails the Playwright visual review. So the graphs can't look like a different product bolted on — they're built from the same parts as everything else.

## 13. Screen-pattern library — Duolingo → Future You (from the in-app screenshots)

Concrete patterns pulled from the logged-in screens. **Reuse the *structure and feel*, re-skinned to our palette/illustrations — and deliberately drop Duolingo's monetization and pressure mechanics** (Super upsells, hearts/lives, streak guilt, league competition, ad-blocker nags). Keep what makes it *welcoming and clear*, not what makes it *addictive*.

**App shell — three columns:**

- **Left sidebar nav** (fixed): wordmark top; items = flat coloured icon + UPPERCASE label; **active item = a soft tinted pill** (Duo uses light blue → ours: `--green-300` tint with `--green-600`/`--ink` text); a small utility card pinned at the bottom. Icons in our flat illustration style, not Duo's.
- **Center column** (~720px): the single focus of the screen.
- **Right status rail**: stacked white rounded cards (thin border, padded) — title + a `--sky` "VIEW ALL" link + rows; at most **one dark gradient card** per page for a highlight (ours: `--ink`→`--grape` gradient, white pill CTA).
- **Top-right stat counters**: icon + bold number. Duo = streak/gems/hearts/league; **ours (honest):** plan health, amount invested, next review — status, never pressure.
- **Responsive:** desktop = left sidebar + right rail; **mobile = a bottom tab bar** (≤6 flat icons, active = rounded-square highlight), one column, the rail content folded inline; secondary menus open as a **rounded bottom sheet** over a dimmed backdrop.

**The journey path (Duo's signature):** a vertical run of chunky **circular 3D nodes** — done (filled green) / current (bold + a white **speech-bubble callout** like "OPEN") / locked (grey). → our **guided journey** (profile → goal → risk → plan) and the **Learn hub** as bite-sized lessons.

**List cards with illustration + badge** (Practice/Shop): white row = bold title + grey subtitle + a colourful illustration on the right, optional **count badge** (red circle "10", "30+"). → our **Learn / Research menus** (Sectors · Concepts · Your holdings) and the **glossary index**.

**Section banner:** a solid-colour header with a 3D bottom edge + white title + a secondary white pill button (Duo's orange unit banner + GUIDEBOOK). → our **research / section headers** (a stock header, the plan header) in a palette colour.

**Progress & milestones:** rounded bar with an end-cap icon + "X / Y"; achievement rows = colourful rounded-square badge + level + gold progress + label. → **financial-literacy progress** and **goal-funding progress** — gentle and optional, never nagging.

**Guidebook page** (audio + sentence + translation rows) → our **glossary / concept reference** and the **"show the maths" explainer**: clean stacked rows, each a term/equation + its plain-language meaning.

**Public landing page** (logged-out — the recruiter-and-family first impression): a long **alternating** page — a big hero (illustration cluster + headline + one primary CTA + a quiet "I have an account" link), then **zig-zag feature sections** (large illustration ↔ heading + short paragraph), one **dark "premium"/highlight band**, and a **bold full-bleed footer** with a peeking mascot. Generous vertical rhythm, big friendly type, our illustrations. Keep it lean (a few sections), not a marketing sprawl.

**Button variants observed (extends §4):** (a) solid colour + 3D edge = primary; (b) **white pill + coloured text + 3D edge** = secondary (UNLOCK / GUIDEBOOK); (c) **circular node** = journey step; (d) ghost text-link in `--sky` (VIEW ALL). All keep the hard bottom-shadow press.

**Accent-role map (their colour → ours):** link/active blue `#1CB0F6` → `--sky`; orange banner `#FF9600` → `--coral` / `--gold`; gold progress `#FFC800` → `--gold`; Super indigo & dark cards → `--ink`→`--grape` gradient. Brand green stays ours, not Duo's.

## 14. To confirm in the design phase (Phase 4)

1. ~~Final font pairing from specimens~~ — **confirmed (Phase 4 Slice 1):** `Baloo 2` (display) + `Nunito` (body/numerals), self-hosted via `next/font`, specimens verified in the `/style-guide` gallery (EN + FR accents).
2. ~~Exact AA-passing green for buttons/text~~ — **resolved (Phase 4 Slice 1):** the two-green split — `--green-600 #247A5E` fill (white text 5.22:1) + `--green-700 #1F6B53` on-light text (6.39:1). See §2 / §11.
3. ~~Background treatment~~ — **resolved (Slice 5.5): white base for the app shell** — `--canvas #F6F8F7` canvas + `#FFFFFF` cards + colour blocks (coral section banner, sky/green tinted cards, one `--ink`→`--grape` gradient). `--paper` cream is kept for the public landing & `/style-guide` only; the `sky/` cloud art stays optional garnish, never a mandatory backdrop. See §2.
4. Light theme only at launch, or a dark theme too.

---

## References

Duolingo design system (for the *language* we're translating, not copying): brand guidelines, colour, typography, and the 3D-button mechanic. See the Sources in chat. Fonts: Baloo 2 & Nunito via Google Fonts (open-license, self-hosted).

**Visual references:** Chinguun's own Duolingo screenshots live in [`/inspiration/duolingo/`](../inspiration/duolingo/) (web app · web landing · iOS). **Open the actual files and map specific patterns → specific screens** — §13 above is the written extraction of them.
