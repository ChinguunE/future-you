# Illustration library — Future You

> **Carried-over reference — read this first.** This library and its descriptions were authored for the previous project; the **art is reused as-is**, but a few notes below are superseded by Future You's specs: the project is now **Future You** (not "Family Portfolio Builder"); there is **no logo** and the `brand/` logo + the `legacy/` set were **not carried over**; the default background is **clean cream/white, not a baby-blue cloud-sky** (`sky/` clouds are optional garnish only — see `../../docs/DESIGN.md` §2); and the app is **Next.js**, so import the art the Next way, not via the Vite example below. The art style, palette, folder structure, and the green **Sprout** mascot all still apply.

**85 ready-to-use illustrations** in one consistent, hand-drawn *marshmallow* style — built so Claude Code (or anyone) can drop the right picture onto any screen in seconds.

## How to use this (read me first)

- **Pick by meaning, not by guessing.** Every file is in a folder by purpose and named for what it *means* (e.g. `concepts/compounding.svg`, `sectors/technology.svg`). Browse the tables below, or read **`illustrations.json`** — the machine-readable manifest with a `useWhen` hint and `tags` for every item.
- **Format:** all illustrations are **SVG** (scalable, themeable, tiny). The 8 goal icons are **PNG** (512×512, transparent) — no vector source exists for those. *(The `brand/` logo was not carried over — Future You uses no logo.)*
- **Safe to inline:** every SVG's internal ids are **namespaced per file** (e.g. `concepts-dividends-gradient_0`), so you can inline many on one page — or animate them — with **no id collisions**.
- **Transparent backgrounds**, centred, generous padding — they sit on any background without boxes (Future You uses a clean cream/white background, not the old baby-blue sky).
- **The mascot is the green two-leaf *Sprout*.** Its poses live in `mascot/`; reach for one on every screen so the app feels like one warm, guided world.
- **`legacy/`** holds the older loose art (`hero`, `stay_the_course`, `icon_set`, the original favicon, raw copies). Kept for reference — not part of the active set.

### Importing in the React app (Vite)

```ts
// one illustration
import compounding from '@/assets/illustrations/concepts/compounding.svg';
// …or load the whole library at build time and look up by id
const art = import.meta.glob('@/assets/illustrations/**/*.{svg,png}', { eager: true, query: '?url', import: 'default' });
// art['/src/assets/illustrations/mascot/cheering.svg'] -> url
```
> Tip: `illustrations.json` mirrors this folder, so you can generate a typed `Illustration` union or a `<Sprout pose="cheering"/>` component straight from it.

## What's inside (85 files)

| folder | count | what it's for |
|---|---|---|
| `mascot/` | 29 | the Sprout companion in every pose |
| `characters/` | 5 | extra friends for variety |
| `concepts/` | 12 | explain a finance idea at a glance |
| `sectors/` | 10 | industry pick screen |
| `money/` | 5 | saving & deposits |
| `switzerland/` | 2 | the Swiss guide |
| `sky/` | 11 | the drifting background |
| `scenes/` | 2 | welcome / finish headers |
| `goals/` | 8 | the goal-picker icons |
| `brand/` | 1 | app logo |

### 🌱 mascot/ — Sprout, the companion character (poses)

| file | what it is | use when |
|---|---|---|
| `mascot/arms-out.svg` | Sprout arms open — Sprout with arms spread wide, welcoming. | a welcome, a reveal, presenting good news |
| `mascot/balancing-beam.svg` | Sprout balancing — Sprout balancing happily on a low beam. | the risk step, balance between safety and growth |
| `mascot/calm.svg` | Sprout calm — Sprout standing calmly, eyes closed, relaxed. | 'stay the course', staying calm in a dip, reassurance |
| `mascot/catching-star.svg` | Sprout catching a star — Sprout reaching up to catch a star. | setting a goal, aspirations, the goal step |
| `mascot/celebrating.svg` | Sprout celebrating — Sprout celebrating amid confetti / flowers. | a big milestone, finishing the plan, summary success |
| `mascot/cheering.svg` | Sprout cheering — Sprout with both arms up, celebrating. | a win, a milestone reached, a positive result |
| `mascot/climbing.svg` | Sprout climbing steps — Sprout climbing one small step at a time. | progress, building up contributions, 'one step at a time' |
| `mascot/coin-trail.svg` | Sprout with coin trail — Sprout following a trail of coins. | saving steadily, the path to a goal |
| `mascot/growth-arrow.svg` | Sprout with growth arrow — Sprout watching a sprout-shaped rising arrow. | the growth / projection step, returns over time |
| `mascot/holding-sign.svg` | Sprout holding a sign — Sprout holding a small blank sign (add your own label). | a callout, an empty label you fill in, a banner |
| `mascot/jumping.svg` | Sprout jumping for joy — Sprout jumping happily with little rays. | excitement, a positive result, celebration |
| `mascot/jumping-alt.svg` | Sprout jumping (alt) — Sprout jumping, alternate pose. | excitement, a positive result (variant) |
| `mascot/matterhorn.svg` | Sprout at the Matterhorn — Sprout beside a little Matterhorn with a Swiss flag. | the 'investing in Switzerland' step |
| `mascot/pointing.svg` | Sprout pointing — Sprout pointing to the side to highlight something. | drawing attention to a number, button or tip |
| `mascot/pushing-coin.svg` | Sprout pushing a coin — Sprout pushing / rolling a big gold coin. | effort to save, making money work |
| `mascot/pushing-coin-alt.svg` | Sprout pushing a coin (alt) — Sprout pushing a big coin, alternate pose. | effort to save, making money work (variant) |
| `mascot/reading.svg` | Sprout reading — Sprout reading a little book. | learning, definitions, the glossary, education step |
| `mascot/relaxing-deckchair.svg` | Sprout relaxing — Relaxed sprout in a sun-hat on a deckchair. | the retirement step, financial independence, ease |
| `mascot/riding-wave.svg` | Sprout riding a wave — Sprout calmly riding a wave that dips then rises. | market ups and downs, riding out volatility |
| `mascot/sleeping.svg` | Sprout sleeping — Sprout sleeping peacefully with z z z. | long-term / passive investing, 'set and forget', empty state |
| `mascot/thinking.svg` | Sprout thinking — Sprout with a finger to its chin, pondering. | a question, the risk quiz, 'let's think about this' |
| `mascot/thinking-bubble.svg` | Sprout with thought bubble — Small sprout with a dotted thought bubble. | a tip, an idea, a 'did you know' |
| `mascot/thumbs-up.svg` | Sprout thumbs-up — Sprout giving a thumbs-up. | confirming a good choice, encouragement |
| `mascot/watering.svg` | Sprout watering a plant — Sprout watering a tiny plant. | starting to invest, nurturing savings, regular contributions |
| `mascot/with-clock-plant.svg` | Sprout with clock & plant — Sprout beside a clock and a growing plant. | time in the market, patience, long horizons |
| `mascot/with-globe.svg` | Sprout holding a globe — Sprout holding a little spinning globe. | the industries / global diversification step |
| `mascot/with-magnifier.svg` | Sprout with magnifier — Sprout peering through a magnifying glass. | exploring details, 'how risky is it', research |
| `mascot/with-pie-chart.svg` | Sprout presenting a pie — Sprout proudly presenting a donut / pie chart. | the plan / allocation step, showing the mix |
| `mascot/with-trophy.svg` | Sprout with trophy — Sprout holding a small trophy. | 'well done', goal achieved, completion |

### 👥 characters/ — the supporting cast

| file | what it is | use when |
|---|---|---|
| `characters/blue-waving.svg` | Blue friend waving — Round blue character waving hello. | welcome screens, a friendly greeting, variety |
| `characters/blue-with-coin.svg` | Blue friend with coin — Blue character holding a coin. | saving, a deposit, money moments |
| `characters/grape.svg` | Grape friend — Little purple grape character. | variety in the cast, a buddy on a screen |
| `characters/green-with-coin.svg` | Green friend with coin — Green character holding a coin. | saving, a contribution, money moments |
| `characters/green-with-coins.svg` | Green friend with coins — Green character cheering with coins. | growing savings, a good result |

### 💡 concepts/ — teaching pictures (one image = one idea)

| file | what it is | use when |
|---|---|---|
| `concepts/balance.svg` | Balance — A balance scale, evenly weighed. | explaining balance, fairness, weighing options |
| `concepts/bounce-back.svg` | Bounce back — A gold coin on a coiled spring. | explaining recovery / resilience after a dip |
| `concepts/compounding.svg` | Compounding — A tiny sprout grown into a big leafy tree bearing coins. | explaining compounding / growth over time |
| `concepts/diversification.svg` | Diversification — Several baskets, each holding an egg. | explaining diversification / not all eggs in one basket |
| `concepts/dividends.svg` | Dividends — A tree dropping coins like falling fruit. | explaining dividends / income from holdings |
| `concepts/etf.svg` | What is an ETF — One basket holding many different little fruits. | explaining an ETF / fund as a basket of many holdings |
| `concepts/interest.svg` | Interest & returns — A friendly document showing a percent sign. | explaining interest, returns, rates, the plan summary |
| `concepts/market-ups-and-downs.svg` | Market ups & downs — A smiling boat riding a wave that dips then rises. | explaining volatility and recovery |
| `concepts/markets-app.svg` | Markets on a phone — A smartphone showing a rising chart. | explaining how to invest via an app / broker, live markets |
| `concepts/risk-vs-reward.svg` | Risk vs reward — A friendly seesaw balancing a coin and a heart. | explaining the risk-return trade-off |
| `concepts/stocks-vs-bonds.svg` | Stocks vs bonds — A speedy hare beside a steady tortoise. | explaining stocks (fast, bumpy) vs bonds (slow, steady) |
| `concepts/time-in-market.svg` | Time in the market — A clock gently hugging a growing plant. | explaining patience / time in the market |

### 🏭 sectors/ — industries the family can choose

| file | what it is | use when |
|---|---|---|
| `sectors/clean-energy.svg` | Clean energy — A leaf holding a lightning bolt. | clean energy / renewables theme |
| `sectors/consumer-discretionary.svg` | Consumer discretionary — A cheerful shopping-bag character. | the Consumer Discretionary sector (nice-to-haves) |
| `sectors/consumer-staples.svg` | Consumer staples — A grocery basket of everyday goods. | the Consumer Staples sector (everyday needs) |
| `sectors/financials.svg` | Financials — A classic columned bank building. | the Financials sector / banking |
| `sectors/financials-alt.svg` | Financials (alt) — A bank building, alternate style. | the Financials sector (variant) or a real-world bank |
| `sectors/healthcare.svg` | Health Care — A friendly medical-cross character. | the Health Care sector |
| `sectors/materials.svg` | Materials — A solid cube character. | the Materials sector (industrial inputs) |
| `sectors/real-estate.svg` | Real estate — A tall friendly building. | the Real Estate sector |
| `sectors/technology.svg` | Technology — A friendly microchip character. | the Information Technology sector |
| `sectors/utilities.svg` | Utilities — A lightbulb with a water drop. | the Utilities sector (power & water) |

### 🐷 money/ — saving objects

| file | what it is | use when |
|---|---|---|
| `money/emergency-fund.svg` | Emergency fund — An umbrella sheltering a piggy bank. | explaining an emergency fund / safety buffer |
| `money/monthly-saving.svg` | Monthly saving — A calendar with a coin and a heart. | regular monthly contributions, scheduling savings |
| `money/piggy-bank.svg` | Piggy bank — A friendly piggy bank. | savings in general, a savings pot |
| `money/piggy-bank-coin.svg` | Piggy bank + coin — A piggy bank receiving a coin. | saving, making a deposit |
| `money/savings-jar.svg` | Savings jar — A jar filling with coins. | building up savings over time, a goal pot |

### 🇨🇭 switzerland/ — the Swiss investing guide

| file | what it is | use when |
|---|---|---|
| `switzerland/protected.svg` | Protected — A shield with a checkmark. | safety, protection, 'your money is safe' (e.g. pillar 3a) |
| `switzerland/swiss-coin.svg` | Swiss coin — A gold coin stamped with a Swiss cross. | Swiss francs, the Switzerland investing guide |

### ☁️ sky/ — drifting background & weather

| file | what it is | use when |
|---|---|---|
| `sky/balloon.svg` | Balloon — A single happy blue balloon. | a light, playful accent |
| `sky/bird.svg` | Bird — A tiny bird mid-flight. | a small moving accent across the sky |
| `sky/cloud-big.svg` | Cloud (big) — A big chunky cumulus cloud. | large foreground drifting cloud |
| `sky/cloud-filled.svg` | Cloud (filled) — A soft filled white cloud. | drifting background clouds (solid) |
| `sky/cloud-outline.svg` | Cloud (outline) — A light outline cloud. | drifting background clouds (light layer) |
| `sky/cloud-wide.svg` | Cloud (wide) — A long wispy cloud. | wide drifting background cloud |
| `sky/hot-air-balloon.svg` | Hot-air balloon — A cheerful striped hot-air balloon. | aspiration, rising, a drifting sky accent |
| `sky/rainbow.svg` | Rainbow — A gentle rainbow arc. | optimism, after-the-storm, a cheerful accent |
| `sky/sparkles.svg` | Sparkles — A little cluster of sparkles / stars. | delight, a highlight, a 'magic' accent |
| `sky/sun.svg` | Sun — A smiling sun with soft rays. | a bright corner of the sky, daytime warmth |
| `sky/sun-spark.svg` | Sun with a spark — A sun holding a small lightning bolt. | a lively sky accent; can hint at energy/volatility |

### 🖼️ scenes/ — whole scenes for screen headers

| file | what it is | use when |
|---|---|---|
| `scenes/goal-reached.svg` | Goal reached — A flag planted on a little grassy hill. | reaching a goal, the summary / finish screen |
| `scenes/welcome.svg` | Welcome scene — Sun and soft clouds — a warm opening scene. | the welcome / first screen header |

### 🎯 goals/ — the goal icons (PNG)

| file | what it is | use when |
|---|---|---|
| `goals/build-wealth.png` | Build wealth — A character growing a stack of coins. | the 'build long-term wealth' goal |
| `goals/childrens-future.png` | Children's future — Two characters together — family. | the 'children's future' goal |
| `goals/dream-purchase.png` | Dream purchase — A little sailboat — a dream to buy. | the 'a dream purchase' goal (boat, car, trip) |
| `goals/education.png` | Education — A graduate cap on a stack of books. | the 'education / studies' goal |
| `goals/home-deposit.png` | Home deposit — A character with a house and key. | the 'home / property deposit' goal |
| `goals/independence.png` | Independence — A character planting their own flag. | the 'financial independence' goal |
| `goals/retirement.png` | Retirement — A warm sun — relaxed retirement. | the 'retirement' goal |
| `goals/safety-net.png` | Safety net — An umbrella over a coin. | the 'safety net / rainy-day fund' goal |

### ⭐ brand/ — the logo

| file | what it is | use when |
|---|---|---|
| `brand/logo.svg` | App logo (Sprout) — The Sprout mascot as the app logo / wordmark mark. | the header logo, the favicon, the loading screen |

---

*Style: flat hand-drawn vector — chunky rounded bodies, dot eyes, deep teal-charcoal outline, flat fills (green `#54B49C`, coral `#F07854`, gold `#FCA848`, sky `#6CB4F0`, grape `#9C9CF0`), no shadows. To add more in the same style, match that line and re-export as SVG.*