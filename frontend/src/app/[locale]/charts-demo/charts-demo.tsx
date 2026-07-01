'use client';

import * as React from 'react';
import {useTranslations} from 'next-intl';

import {
  ChartCard,
  ChartGrid,
  type ChartCardLegendItem
} from '@/components/charts/chart-card';
import {StatCard, StatRow} from '@/components/charts/stat-card';
import {
  DrawdownChart,
  type DrawdownPoint
} from '@/components/charts/drawdown-chart';
import {GrowthProjectionChart} from '@/components/charts/growth-projection-chart';
import {
  AllocationDonutChart,
  type AllocationSlice
} from '@/components/charts/allocation-donut-chart';
import {AllocationSunburstChart} from '@/components/charts/allocation-sunburst-chart';
import {AllocationTreemapChart} from '@/components/charts/allocation-treemap-chart';
import {
  MixVsOptimalChart,
  type MixVsOptimalDatum
} from '@/components/charts/mix-vs-optimal-chart';
import {
  GoalFundingGauge,
  type GoalGaugeVerdict
} from '@/components/charts/goal-funding-gauge';
import {ContributionsGrowthChart} from '@/components/charts/contributions-growth-chart';
import {ReturnDistributionChart} from '@/components/charts/return-distribution-chart';
import {CorrelationHeatmap} from '@/components/charts/correlation-heatmap';
import {RiskContributionChart} from '@/components/charts/risk-contribution-chart';
import {EfficientFrontierChart} from '@/components/charts/efficient-frontier-chart';
import {
  PriceHistoryChart,
  type PriceHistoryMode
} from '@/components/charts/price-history-chart';
import {AnalystTargetChart} from '@/components/charts/analyst-target-chart';
import {FundamentalsSnapshot} from '@/components/charts/fundamentals-snapshot';
import {
  StressBarsChart,
  type StressBarDatum
} from '@/components/charts/stress-bars-chart';
import {RollingReturnsChart} from '@/components/charts/rolling-returns-chart';
import {BenchmarkLinesChart} from '@/components/charts/benchmark-lines-chart';
import {
  HoldingsTable,
  type HoldingsTableRow
} from '@/components/charts/holdings-table';
import {
  ExposureTable,
  type ExposureTableRow
} from '@/components/charts/exposure-table';
import {IncomeSplit, type IncomeGroup} from '@/components/charts/income-split';
import {Sprout} from '@/components/illustration/Sprout';
import type {EquationSymbol} from '@/components/ui/equation-block';
import {chartTheme} from '@/lib/chart-theme';
import {
  formatCHF,
  formatCHFCompact,
  formatDecimal,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent
} from '@/lib/format';

import {
  buildContributionsSplit,
  buildContributionsVsGrowth,
  buildDrawdown,
  buildGoalFunding,
  buildProjection,
  GOAL_VALUE,
  HORIZON_YEARS,
  type Horizon
} from './sample-data';
import {
  ALLOCATION,
  buildOptimalVsYou,
  buildSunburst,
  buildTreemap,
  SLEEVE_ORDER,
  TILT_COST,
  type AssetClass,
  type Sleeve,
  type TreemapMetric
} from './allocation-data';
import {
  buildCorrelationMatrix,
  buildFrontier,
  buildReturnDistribution,
  buildRiskContribution,
  correlationRelation,
  topRiskDriver,
  type CorrelationEntity
} from './risk-data';
import {
  buildAnalystTargets,
  buildFundamentals,
  buildPriceSeries,
  STOCK,
  STOCK_RANGES,
  type StockRange
} from './stock-data';
import {
  buildBenchmark,
  buildRolling,
  buildStressBars,
  type StressSeverity
} from './scenario-data';
import {
  buildExposure,
  buildHoldings,
  buildIncome,
  type HoldingRow
} from './tables-data';

/**
 * The interactive island of /charts-demo (client): it owns the horizon state and
 * recasts the sample data when it changes, then hands the data + every resolved
 * string to the presentational ChartCard + charts. i18n lives here (like the
 * teaching-primitives page), so the components stay prop-driven and reusable.
 *
 * Two cards prove the shared chart language across genuinely different chart types:
 * the honest growth fan (upside range) and the drawdown underwater plot (downside
 * pain). Each card owns its own horizon so the theme is exercised independently.
 */

const bold = (chunks: React.ReactNode) => (
  <b className="font-bold text-ink">{chunks}</b>
);

const HORIZON_OPTION_KEYS = ['short', 'medium', 'long'] as const;

// The future-value formula is language-neutral (symbols + numbers). The worked
// example matches the 15-year sample scenario; thin spaces (\,) keep the numbers
// reading the same in EN and FR (a comma would mean a decimal in French).
const FV_FORMULA = 'FV = P(1+r)^{n} + C \\cdot \\dfrac{(1+r)^{n} - 1}{r}';
const FV_EXAMPLE =
  '\\begin{aligned} FV &= 10\\,000\\left(1 + \\tfrac{0.05}{12}\\right)^{180} + 300 \\cdot \\dfrac{\\left(1 + \\tfrac{0.05}{12}\\right)^{180} - 1}{0.05 / 12} \\\\ &\\approx \\text{CHF } 100\\,000 \\end{aligned}';

// Maximum drawdown — the deepest fall from a running peak (also language-neutral).
// V_peak (the running peak) reads clearer for a beginner than the min/max operator,
// and matches the worked example's V_trough / V_peak.
const MDD_FORMULA =
  '\\text{MDD} = \\min_{t}\\left( \\dfrac{V_t}{V_{\\text{peak}}} - 1 \\right)';

// Return per unit of risk (Sharpe-like) — language-neutral. The worked example uses
// the sample tilt-cost figures; a bare ratio reads the same in EN and FR (thin spaces
// aren't needed here — the values are small percentages, not grouped thousands).
const SHARPE_FORMULA = 'S = \\dfrac{R}{\\sigma}';
const SHARPE_EXAMPLE =
  '\\dfrac{5.5\\%}{10.4\\%} \\approx 0.53 \\quad \\text{vs} \\quad \\dfrac{5.2\\%}{9.6\\%} \\approx 0.54';

// A single rough-year loss (parametric VaR) — the average yearly return minus how far
// into the bad tail you look, in risk-swings. Language-neutral; the example is your mix's
// 1-in-20 year (μ 5.5%, σ 10.4%, z −1.65). This uses the FULL annual σ (a single year),
// unlike the return-distribution card, which averages σ over the whole horizon.
const STRESS_FORMULA = '\\text{loss} = \\mu + z\\,\\sigma';
const STRESS_EXAMPLE = '5.5\\% + (-1.65)\\times 10.4\\% \\approx -11.6\\%';

// How the yearly swing shrinks with the length of the hold — the one-year swing divided
// by the square root of the number of years (good and bad years average out). The example
// is your mix over ten years (σ 10.4% → about 3.3%). Language-neutral.
const ROLLING_FORMULA = '\\sigma_n = \\dfrac{\\sigma}{\\sqrt{n}}';
const ROLLING_EXAMPLE = '\\sigma_{10} = \\dfrac{10.4\\%}{\\sqrt{10}} \\approx 3.3\\%';

/** The growth fan (Slice 8a) — an honest median inside a p10–p90 range. */
function ProjectionCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const [horizon, setHorizon] = React.useState<Horizon>('medium');

  const data = React.useMemo(() => buildProjection(horizon), [horizon]);

  const symbols: EquationSymbol[] = [
    {tex: 'FV', meaning: t('projection.eqSymFV')},
    {tex: 'P', meaning: t('projection.eqSymP')},
    {tex: 'C', meaning: t('projection.eqSymC')},
    {tex: 'r', meaning: t('projection.eqSymR')},
    {tex: 'n', meaning: t('projection.eqSymN')}
  ];

  const legend: ChartCardLegendItem[] = [
    {shape: 'line', color: chartTheme.median, label: t('projection.legendLikely')},
    {shape: 'band', color: chartTheme.band, label: t('projection.legendRange')},
    {shape: 'dashed', color: chartTheme.goal, label: t('projection.legendGoal')},
    {shape: 'dot', color: chartTheme.here, label: t('projection.legendHere')}
  ];

  const tableRows = data.map((d) => ({
    year: String(d.year),
    rough: formatCHF(d.p10, locale),
    likely: formatCHF(d.median, locale),
    good: formatCHF(d.p90, locale)
  }));

  // The card's own KPI header shows ONLY the stat unique to this chart — the rough→
  // good RANGE (the "most likely" + "your goal" figures live in the dashboard glance
  // strip, so nothing is repeated). Derived from the same sample data the fan draws.
  const last = data[data.length - 1];
  const yearStr = String(last.year);
  const projectionStats = (
    <div className="max-w-sm">
      <StatCard
        tone="neutral"
        label={t('projection.stats.rangeLabel', {year: yearStr})}
        value={`${formatCHFCompact(last.p10, locale)} – ${formatCHFCompact(
          last.p90,
          locale
        )}`}
        note={t('projection.stats.rangeNote')}
      />
    </div>
  );

  return (
    <ChartCard
      title={t('projection.title')}
      stats={projectionStats}
      caption={t('projection.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: horizon,
        onValueChange: (v) => setHorizon(v as Horizon),
        label: t('horizon.label'),
        options: HORIZON_OPTION_KEYS.map((key) => ({
          value: key,
          label: t(`horizon.${key}`)
        }))
      }}
      legend={legend}
      table={{
        caption: t('projection.tableCaption'),
        columns: [
          {key: 'year', label: t('projection.colYear')},
          {key: 'rough', label: t('projection.colRough'), numeric: true},
          {key: 'likely', label: t('projection.colLikely'), numeric: true},
          {key: 'good', label: t('projection.colGood'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('projection.eqResult', {b: bold}),
        showMathsLabel: t('showMaths'),
        formula: FV_FORMULA,
        formulaAlt: t('projection.eqFormulaAlt'),
        symbolsLabel: t('projection.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('projection.eqExampleLabel'),
        exampleFormula: FV_EXAMPLE,
        exampleAlt: t('projection.eqExampleAlt'),
        exampleCaption: t('projection.eqExampleCaption'),
        whyLabel: t('projection.eqWhyLabel'),
        why: t('projection.eqWhy')
      }}
      mascot={
        <Sprout pose="growth-arrow" size={88} decorative animated={false} eager />
      }
    >
      <GrowthProjectionChart
        data={data}
        goal={{value: GOAL_VALUE, label: t('projection.goal')}}
        here={{
          year: data[0].year,
          value: data[0].median,
          label: t('projection.here')
        }}
        labels={{
          likely: t('projection.likely'),
          good: t('projection.good'),
          rough: t('projection.rough')
        }}
        formatValue={(n) => formatCHF(n, locale)}
        formatAxisValue={(n) => formatCHFCompact(n, locale)}
        formatYear={(y) => t('projection.tooltipYear', {year: String(y)})}
        ariaLabel={t('projection.ariaLabel')}
      />
    </ChartCard>
  );
}

/** The drawdown underwater plot (Slice 8b) — the honest downside "stomach test". */
function DrawdownCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  // Default to the long horizon: it tells the deepest, richest downside story.
  const [horizon, setHorizon] = React.useState<Horizon>('long');

  const {points, summary} = React.useMemo(
    () => buildDrawdown(horizon),
    [horizon]
  );

  const mddStr = formatPercent(summary.maxDrawdown, locale);
  const peakStr = formatCHF(summary.peakValue, locale);
  const troughStr = formatCHF(summary.troughValue, locale);

  const symbols: EquationSymbol[] = [
    {tex: 'V_t', meaning: t('drawdown.eqSymV')},
    {tex: 'V_{\\text{peak}}', meaning: t('drawdown.eqSymPeak')},
    {tex: '\\text{MDD}', meaning: t('drawdown.eqSymMdd')}
  ];

  // Worked example on the sample's real trough/peak — a ratio, so no big franc
  // numbers land inside the TeX (they stay in the plain-language prose instead).
  const exampleFormula = `\\dfrac{V_{\\text{trough}}}{V_{\\text{peak}}} - 1 \\approx ${summary.maxDrawdown.toFixed(
    2
  )} = ${Math.round(summary.maxDrawdown * 100)}\\%`;

  const legend: ChartCardLegendItem[] = [
    {shape: 'band', color: chartTheme.neg, label: t('drawdown.legendFall')},
    {
      shape: 'dashed',
      color: chartTheme.axis.stroke,
      label: t('drawdown.legendWaterline')
    },
    {shape: 'dot', color: chartTheme.neg, label: t('drawdown.legendWorst')}
  ];

  // The table shows the deepest dip in EACH year (the most informative row), so a
  // long monthly series stays a compact, readable a11y fallback.
  const worstByYear = new Map<number, DrawdownPoint>();
  for (const p of points) {
    const cur = worstByYear.get(p.year);
    if (!cur || p.drawdown < cur.drawdown) worstByYear.set(p.year, p);
  }
  const tableRows = [...worstByYear.values()].map((p) => ({
    year: String(p.year),
    drawdown: formatPercent(p.drawdown, locale),
    value: formatCHF(p.value, locale),
    peak: formatCHF(p.peak, locale)
  }));

  // The card's own KPI header shows ONLY the stat unique to this chart — the PEAK →
  // TROUGH it fell across (worst dip + recovered live in the dashboard glance strip,
  // so nothing is repeated). One line, from the same summary the chart marks.
  const drawdownStats = (
    <div className="max-w-sm">
      <StatCard
        tone="neutral"
        label={t('drawdown.stats.peakToTroughLabel')}
        value={
          <span className="whitespace-nowrap">
            {`${formatCHFCompact(summary.peakValue, locale)} → ${formatCHFCompact(
              summary.troughValue,
              locale
            )}`}
          </span>
        }
        note={t('drawdown.stats.peakToTroughNote')}
      />
    </div>
  );

  return (
    <ChartCard
      title={t('drawdown.title')}
      stats={drawdownStats}
      caption={t('drawdown.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: horizon,
        onValueChange: (v) => setHorizon(v as Horizon),
        label: t('horizon.label'),
        options: HORIZON_OPTION_KEYS.map((key) => ({
          value: key,
          label: t(`horizon.${key}`)
        }))
      }}
      legend={legend}
      table={{
        caption: t('drawdown.tableCaption'),
        columns: [
          {key: 'year', label: t('drawdown.colYear')},
          {key: 'drawdown', label: t('drawdown.colDrawdown'), numeric: true},
          {key: 'value', label: t('drawdown.colValue'), numeric: true},
          {key: 'peak', label: t('drawdown.colPeak'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('drawdown.eqResult', {
          b: bold,
          mdd: mddStr,
          peak: peakStr,
          trough: troughStr
        }),
        showMathsLabel: t('showMaths'),
        formula: MDD_FORMULA,
        formulaAlt: t('drawdown.eqFormulaAlt'),
        symbolsLabel: t('drawdown.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('drawdown.eqExampleLabel'),
        exampleFormula,
        exampleAlt: t('drawdown.eqExampleAlt'),
        exampleCaption: t('drawdown.eqExampleCaption', {
          peak: peakStr,
          trough: troughStr
        }),
        whyLabel: t('drawdown.eqWhyLabel'),
        why: t('drawdown.eqWhy')
      }}
      mascot={
        <Sprout pose="calm" size={88} decorative animated={false} eager />
      }
    >
      <DrawdownChart
        data={points}
        trough={{
          t: summary.troughT,
          drawdown: summary.maxDrawdown,
          label: t('drawdown.troughLabel', {mdd: mddStr})
        }}
        episode={{startT: summary.startT, endT: summary.recoveryT}}
        waterlineLabel={t('drawdown.waterline')}
        labels={{
          below: t('drawdown.below'),
          value: t('drawdown.value'),
          peak: t('drawdown.peak')
        }}
        formatValue={(n) => formatCHF(n, locale)}
        formatPercent={(n) => formatPercent(n, locale)}
        formatYear={(y) => t('drawdown.tooltipYear', {year: String(y)})}
        ariaLabel={t('drawdown.ariaLabel')}
      />
    </ChartCard>
  );
}

/**
 * The dashboard KPI strip (DESIGN §6 research/dashboard mode + §12 richness pass) —
 * the premium-dashboard pattern of a headline stat row above the detailed cards. It
 * summarises the plan at each card's DEFAULT horizon (15y growth, 30y drawdown), all
 * from the same sample engine as the charts below. Reuses the projection + drawdown
 * stat strings, so the row can never drift from the cards' own headers.
 */
function PlanGlance({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const projection = React.useMemo(() => buildProjection('medium'), []);
  const {summary} = React.useMemo(() => buildDrawdown('long'), []);

  const last = projection[projection.length - 1];
  const gain = last.median - projection[0].median;
  const yearStr = String(last.year);
  const recoveryYear = Math.round(summary.recoveryT);

  return (
    // Its own container so the 4-up KPI strip flows by the section's width: one
    // column on phones, two on tablets, four across on desktop.
    <section className="@container space-y-3">
      <h2 className="text-h3 text-ink">{t('glanceTitle')}</h2>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @4xl:grid-cols-4">
        <StatCard
          tone="brand"
          label={t('projection.stats.likelyLabel', {year: yearStr})}
          value={formatCHF(last.median, locale)}
          delta={{
            direction: 'up',
            value: formatCHFCompact(gain, locale),
            label: t('projection.stats.likelyDelta')
          }}
        />
        <StatCard
          tone="neg"
          label={t('drawdown.stats.worstLabel')}
          value={formatPercent(summary.maxDrawdown, locale)}
          delta={{direction: 'down', value: t('drawdown.stats.worstPill')}}
        />
        <StatCard
          tone="gold"
          label={t('projection.stats.goalLabel')}
          value={formatCHF(GOAL_VALUE, locale)}
          note={t('projection.stats.goalNote')}
        />
        <StatCard
          tone={summary.recovered ? 'brand' : 'neutral'}
          label={t('drawdown.stats.recoveredLabel')}
          value={
            summary.recovered
              ? t('drawdown.stats.recoveredYes')
              : t('drawdown.stats.recoveredNo')
          }
          note={
            summary.recovered
              ? t('drawdown.stats.recoveredYesNote', {year: String(recoveryYear)})
              : t('drawdown.stats.recoveredNoNote')
          }
        />
      </div>
    </section>
  );
}

/* ===================== Wave A — "Your mix" (Slice 9) ===================== */

/** A1 — the allocation donut: your mix by sleeve, with a headline KPI in the hole. */
function DonutCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const sleeveLabel = (s: Sleeve) => t(`mix.sleeve.${s}`);
  const share = (v: number) => formatPercent(v, locale);

  const slices: AllocationSlice[] = SLEEVE_ORDER.filter(
    (s) => ALLOCATION.sleeves[s] > 0
  ).map((s) => ({sleeve: s, label: sleeveLabel(s), value: ALLOCATION.sleeves[s]}));

  const legend: ChartCardLegendItem[] = slices.map((s) => ({
    shape: 'band',
    color: chartTheme.sleeveColor[s.sleeve],
    label: `${s.label} · ${share(s.value)}`
  }));

  const tableRows = slices.map((s) => ({
    sleeve: s.label,
    share: share(s.value),
    role: t(`mix.donut.role.${s.sleeve}`)
  }));

  const stats = (
    <div className="max-w-sm">
      <StatCard
        tone="brand"
        label={t('mix.donut.stats.splitLabel')}
        value={`${share(ALLOCATION.coreWeight)} / ${share(ALLOCATION.satelliteWeight)}`}
        note={t('mix.donut.stats.splitNote')}
      />
    </div>
  );

  return (
    <ChartCard
      title={t('mix.donut.title')}
      stats={stats}
      caption={t('mix.donut.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('mix.donut.tableCaption'),
        columns: [
          {key: 'sleeve', label: t('mix.donut.colSleeve')},
          {key: 'share', label: t('mix.donut.colShare'), numeric: true},
          {key: 'role', label: t('mix.donut.colRole')}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="with-pie-chart" size={88} decorative animated={false} eager />
      }
    >
      <AllocationDonutChart
        slices={slices}
        center={{
          value: share(ALLOCATION.sleeves.equity),
          label: t('mix.donut.centerLabel')
        }}
        shareLabel={t('mix.donut.shareLabel')}
        formatShare={share}
        ariaLabel={t('mix.donut.ariaLabel')}
      />
    </ChartCard>
  );
}

/** A2 — the sunburst: sleeve → asset class → holding, three nested rings. */
function SunburstCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const sleeveLabel = (s: Sleeve) => t(`mix.sleeve.${s}`);
  const acLabel = (ac: AssetClass) => t(`mix.assetClass.${ac}`);
  const share = (v: number) => formatPercent(v, locale);

  const data = buildSunburst({
    root: t('mix.root'),
    sleeve: sleeveLabel,
    assetClass: acLabel
  });

  const legend: ChartCardLegendItem[] = SLEEVE_ORDER.filter(
    (s) => ALLOCATION.sleeves[s] > 0
  ).map((s) => ({
    shape: 'band',
    color: chartTheme.sleeveColor[s],
    label: sleeveLabel(s)
  }));

  const tableRows = ALLOCATION.holdings.map((h) => ({
    sleeve: sleeveLabel(h.sleeve),
    assetClass: acLabel(h.assetClass),
    holding: `${h.name} (${h.ticker})`,
    weight: share(h.weight)
  }));

  // Counts derived from the data (never baked into the copy) so the note can't drift.
  const sleeveCount = SLEEVE_ORDER.filter((s) => ALLOCATION.sleeves[s] > 0).length;
  const classCount = new Set(ALLOCATION.holdings.map((h) => h.assetClass)).size;

  const stats = (
    <div className="max-w-sm">
      <StatCard
        tone="sky"
        label={t('mix.sunburst.stats.label')}
        value={formatNumber(ALLOCATION.holdings.length, locale)}
        note={t('mix.sunburst.stats.note', {
          sleeves: formatNumber(sleeveCount, locale),
          classes: formatNumber(classCount, locale)
        })}
      />
    </div>
  );

  return (
    <ChartCard
      title={t('mix.sunburst.title')}
      stats={stats}
      caption={t('mix.sunburst.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('mix.sunburst.tableCaption'),
        columns: [
          {key: 'sleeve', label: t('mix.sunburst.colSleeve')},
          {key: 'assetClass', label: t('mix.sunburst.colAssetClass')},
          {key: 'holding', label: t('mix.sunburst.colHolding')},
          {key: 'weight', label: t('mix.sunburst.colWeight'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="with-magnifier" size={88} decorative animated={false} eager />
      }
    >
      <AllocationSunburstChart
        data={data}
        shareLabel={t('mix.sunburst.shareLabel')}
        formatShare={share}
        ariaLabel={t('mix.sunburst.ariaLabel')}
      />
    </ChartCard>
  );
}

/** A3 — the treemap: every holding by money or by risk (a metric toggle). */
function TreemapCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const [metric, setMetric] = React.useState<TreemapMetric>('weight');
  const sleeveLabel = (s: Sleeve) => t(`mix.sleeve.${s}`);
  const share = (v: number) => formatPercent(v, locale);

  const data = buildTreemap(metric, t('mix.root'));
  const isWeight = metric === 'weight';

  const legend: ChartCardLegendItem[] = SLEEVE_ORDER.filter(
    (s) => ALLOCATION.sleeves[s] > 0
  ).map((s) => ({
    shape: 'band',
    color: chartTheme.sleeveColor[s],
    label: sleeveLabel(s)
  }));

  const tableRows = ALLOCATION.holdings.map((h) => ({
    holding: `${h.name} (${h.ticker})`,
    sleeve: sleeveLabel(h.sleeve),
    weight: share(h.weight),
    risk: share(h.riskContribution)
  }));

  // The holding that carries the most risk PER FRANC invested — a small position can
  // punch far above its weight (the divergence the weight/risk toggle reveals). Guard
  // the ratio against a zero weight, so real engine data in Phase 5 can't yield NaN.
  const riskPerFranc = (h: {riskContribution: number; weight: number}) =>
    h.weight > 0 ? h.riskContribution / h.weight : 0;
  const riskDriver = ALLOCATION.holdings.reduce((a, b) =>
    riskPerFranc(b) > riskPerFranc(a) ? b : a
  );

  const stats = (
    <div className="max-w-sm">
      <StatCard
        tone="neg"
        label={t('mix.treemap.stats.label')}
        value={riskDriver.name}
        note={t('mix.treemap.stats.note', {
          weight: share(riskDriver.weight),
          risk: share(riskDriver.riskContribution)
        })}
      />
    </div>
  );

  return (
    <ChartCard
      title={t('mix.treemap.title')}
      stats={stats}
      caption={t('mix.treemap.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      // The left-hand control slot carries the weight/risk metric toggle here (the
      // treemap is a static allocation, so it has no time horizon).
      horizon={{
        value: metric,
        onValueChange: (v) => setMetric(v as TreemapMetric),
        label: t('mix.treemap.metricLabel'),
        options: [
          {value: 'weight', label: t('mix.treemap.metricWeight')},
          {value: 'risk', label: t('mix.treemap.metricRisk')}
        ]
      }}
      legend={legend}
      table={{
        caption: t('mix.treemap.tableCaption'),
        columns: [
          {key: 'holding', label: t('mix.treemap.colHolding')},
          {key: 'sleeve', label: t('mix.treemap.colSleeve')},
          {key: 'weight', label: t('mix.treemap.colWeight'), numeric: true},
          {key: 'risk', label: t('mix.treemap.colRisk'), numeric: true}
        ],
        rows: tableRows
      }}
    >
      <AllocationTreemapChart
        data={data}
        shareLabel={isWeight ? t('mix.treemap.shareWeight') : t('mix.treemap.shareRisk')}
        formatShare={share}
        ariaLabel={
          isWeight ? t('mix.treemap.ariaLabelWeight') : t('mix.treemap.ariaLabelRisk')
        }
      />
    </ChartCard>
  );
}

/** A4 — your mix vs the optimal mix: per-holding grouped bars + the tilt-cost KPIs. */
function OptimalCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const share = (v: number) => formatPercent(v, locale);
  const share1 = (v: number) => formatPercent(v, locale, {maximumFractionDigits: 1});
  const signed1 = (v: number) =>
    formatPercent(v, locale, {maximumFractionDigits: 1, signDisplay: 'always'});

  const data: MixVsOptimalDatum[] = buildOptimalVsYou();

  const labels = {
    optimal: t('mix.optimal.legendOptimal'),
    your: t('mix.optimal.legendYours'),
    over: t('mix.optimal.over'),
    under: t('mix.optimal.under'),
    same: t('mix.optimal.same')
  };

  const legend: ChartCardLegendItem[] = [
    {shape: 'band', color: chartTheme.series[3], label: labels.optimal},
    {shape: 'band', color: chartTheme.series[0], label: labels.your}
  ];

  const tableRows = data.map((d) => {
    const dir = d.delta > 0.0005 ? 'up' : d.delta < -0.0005 ? 'down' : 'flat';
    const glyph = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '→';
    const cls =
      dir === 'up' ? 'text-pos' : dir === 'down' ? 'text-neg' : 'text-text-muted';
    return {
      holding: `${d.name} (${d.ticker})`,
      optimal: share(d.optimal),
      yours: share(d.your),
      delta: (
        <span className={`nums ${cls}`}>
          <span aria-hidden className="mr-0.5">
            {glyph}
          </span>
          {formatPercent(d.delta, locale, {signDisplay: 'always'})}
        </span>
      )
    };
  });

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-2">
      <StatCard
        tone="brand"
        label={t('mix.optimal.stats.returnLabel')}
        value={share1(TILT_COST.tiltedReturn)}
        delta={{
          direction: 'up',
          value: signed1(TILT_COST.tiltedReturn - TILT_COST.optimalReturn),
          label: t('mix.optimal.stats.vsOptimal')
        }}
      />
      <StatCard
        tone="neg"
        label={t('mix.optimal.stats.riskLabel')}
        value={share1(TILT_COST.tiltedRisk)}
        note={`${signed1(TILT_COST.tiltedRisk - TILT_COST.optimalRisk)} ${t('mix.optimal.stats.vsOptimal')}`}
      />
    </StatRow>
  );

  const symbols: EquationSymbol[] = [
    {tex: 'S', meaning: t('mix.optimal.eqSymS')},
    {tex: 'R', meaning: t('mix.optimal.eqSymR')},
    {tex: '\\sigma', meaning: t('mix.optimal.eqSymSigma')}
  ];

  return (
    <ChartCard
      title={t('mix.optimal.title')}
      stats={stats}
      caption={t('mix.optimal.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('mix.optimal.tableCaption'),
        columns: [
          {key: 'holding', label: t('mix.optimal.colHolding')},
          {key: 'optimal', label: t('mix.optimal.colOptimal'), numeric: true},
          {key: 'yours', label: t('mix.optimal.colYours'), numeric: true},
          {key: 'delta', label: t('mix.optimal.colDelta'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('mix.optimal.eqResult', {
          b: bold,
          yourR: share1(TILT_COST.tiltedReturn),
          optR: share1(TILT_COST.optimalReturn),
          yourRisk: share1(TILT_COST.tiltedRisk),
          optRisk: share1(TILT_COST.optimalRisk)
        }),
        showMathsLabel: t('showMaths'),
        formula: SHARPE_FORMULA,
        formulaAlt: t('mix.optimal.eqFormulaAlt'),
        symbolsLabel: t('mix.optimal.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('mix.optimal.eqExampleLabel'),
        exampleFormula: SHARPE_EXAMPLE,
        exampleAlt: t('mix.optimal.eqExampleAlt'),
        exampleCaption: t('mix.optimal.eqExampleCaption'),
        whyLabel: t('mix.optimal.eqWhyLabel'),
        why: t('mix.optimal.eqWhy')
      }}
    >
      <MixVsOptimalChart
        data={data}
        labels={labels}
        formatShare={share}
        ariaLabel={t('mix.optimal.ariaLabel')}
      />
    </ChartCard>
  );
}

/* ===================== Wave B — "Your growth" (Slice 9) ===================== */

// Goal-funding: the chance the range of futures clears the goal — Φ of the
// standardised gap between the most-likely amount and the goal. Language-neutral:
// thin spaces (\,) keep the numbers reading the same in EN/FR, and "≈ 52%" avoids a
// decimal point (a comma would mean a decimal in French). Numbers trace to the
// medium-horizon sample (median 101'324, spread σ 24'497).
const GAUGE_FORMULA = 'p = \\Phi\\!\\left(\\dfrac{M - G}{\\sigma}\\right)';
const GAUGE_EXAMPLE =
  '\\Phi\\!\\left(\\dfrac{101\\,324 - 100\\,000}{24\\,497}\\right) \\approx 52\\%';

// Contributions vs growth: your balance is what you put in plus what it earned. The
// worked example is the 30-year sample (10'000 start + 300×360 deposits + 176'355
// of growth ≈ CHF 294'000).
const GROWTH_FORMULA = 'V = (P + C\\,n) + G';
const GROWTH_EXAMPLE =
  '(10\\,000 + 300 \\times 360) + 176\\,355 \\approx \\text{CHF } 294\\,000';

/** B1 — the goal-funding gauge: your odds of reaching the goal, recast by horizon. */
function GoalFundingCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const [horizon, setHorizon] = React.useState<Horizon>('medium');
  const share = (v: number) => formatPercent(v, locale);

  const data = React.useMemo(() => buildGoalFunding(horizon), [horizon]);

  // The verdict word carries the meaning alongside the % (never colour-alone): a
  // ▲/→/▼ glyph + a plain word + a pos/neutral/neg tone, from the probability itself.
  const verdict: GoalGaugeVerdict =
    data.probability >= 0.75
      ? {label: t('goal.verdict.onTrack'), glyph: '▲', tone: 'pos'}
      : data.probability >= 0.4
        ? {label: t('goal.verdict.withinReach'), glyph: '→', tone: 'neutral'}
        : {label: t('goal.verdict.stretch'), glyph: '▼', tone: 'neg'};

  // The table compares the odds across every horizon — the story the gauge tells one
  // frame at a time — computed from the same builder so it can never drift.
  const tableRows = HORIZON_OPTION_KEYS.map((key) => {
    const g = buildGoalFunding(key);
    return {
      timeframe: t(`horizon.${key}`),
      chance: share(g.probability),
      likely: formatCHF(g.terminalMedian, locale)
    };
  });

  // The card's own KPI shows a stat the gauge centre doesn't: how far the MOST-LIKELY
  // path lands from the goal (the gauge shows the odds; this shows the middle outcome).
  const stats = (
    <div className="max-w-sm">
      <StatCard
        tone={data.medianReaches ? 'brand' : 'gold'}
        label={t('goal.stats.gapLabel')}
        value={formatCHFCompact(Math.abs(data.gapToGoal), locale)}
        delta={{
          direction: data.medianReaches ? 'up' : 'down',
          value: data.medianReaches
            ? t('goal.stats.clears')
            : t('goal.stats.short')
        }}
      />
    </div>
  );

  const symbols: EquationSymbol[] = [
    {tex: '\\Phi', meaning: t('goal.eqSymPhi')},
    {tex: 'M', meaning: t('goal.eqSymM')},
    {tex: 'G', meaning: t('goal.eqSymG')},
    {tex: '\\sigma', meaning: t('goal.eqSymSigma')}
  ];

  // The worked example is fixed at the medium horizon (like the projection card), its
  // numbers interpolated from the same builder so the prose can't drift.
  const example = buildGoalFunding('medium');

  return (
    <ChartCard
      title={t('goal.title')}
      stats={stats}
      caption={t('goal.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: horizon,
        onValueChange: (v) => setHorizon(v as Horizon),
        label: t('horizon.label'),
        options: HORIZON_OPTION_KEYS.map((key) => ({
          value: key,
          label: t(`horizon.${key}`)
        }))
      }}
      table={{
        caption: t('goal.tableCaption'),
        columns: [
          {key: 'timeframe', label: t('goal.colTimeframe')},
          {key: 'chance', label: t('goal.colChance'), numeric: true},
          {key: 'likely', label: t('goal.colLikely'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('goal.eqResult', {
          b: bold,
          year: String(example.targetYear),
          median: formatCHF(example.terminalMedian, locale),
          prob: formatPercent(example.probability, locale),
          goal: formatCHF(example.goal, locale)
        }),
        showMathsLabel: t('showMaths'),
        formula: GAUGE_FORMULA,
        formulaAlt: t('goal.eqFormulaAlt'),
        symbolsLabel: t('goal.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('goal.eqExampleLabel'),
        exampleFormula: GAUGE_EXAMPLE,
        exampleAlt: t('goal.eqExampleAlt'),
        exampleCaption: t('goal.eqExampleCaption'),
        whyLabel: t('goal.eqWhyLabel'),
        why: t('goal.eqWhy')
      }}
      mascot={
        <Sprout pose="catching-star" size={88} decorative animated={false} eager />
      }
    >
      <GoalFundingGauge
        probability={data.probability}
        percentLabel={share(data.probability)}
        subLabel={t('goal.centerSub', {
          goal: formatCHF(data.goal, locale),
          year: String(data.targetYear)
        })}
        verdict={verdict}
        ariaLabel={t('goal.ariaLabel')}
      />
    </ChartCard>
  );
}

/** B2 — contributions vs growth: what you added vs what it earned, over time. */
function ContributionsCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  // Default to long: the crossover (growth overtaking deposits) only shows on a long
  // enough horizon — the richest "compounding takes over" story.
  const [horizon, setHorizon] = React.useState<Horizon>('long');
  const share = (v: number) => formatPercent(v, locale);

  const data = React.useMemo(
    () => buildContributionsVsGrowth(horizon),
    [horizon]
  );
  const split = React.useMemo(() => buildContributionsSplit(horizon), [horizon]);

  const labels = {
    contributions: t('contributions.added'),
    growth: t('contributions.earned'),
    total: t('contributions.total')
  };

  const legend: ChartCardLegendItem[] = [
    {
      shape: 'band',
      color: chartTheme.contributions,
      label: t('contributions.legendAdded')
    },
    {
      shape: 'band',
      color: chartTheme.growth,
      label: t('contributions.legendEarned')
    }
  ];

  const tableRows = data.map((d) => ({
    year: String(d.year),
    added: formatCHF(d.contributions, locale),
    earned: formatCHF(d.growth, locale),
    total: formatCHF(d.total, locale)
  }));

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="sky"
        label={t('contributions.stats.addedLabel')}
        value={formatCHFCompact(split.contributions, locale)}
        note={t('contributions.stats.addedNote')}
      />
      <StatCard
        tone="brand"
        label={t('contributions.stats.earnedLabel')}
        value={formatCHFCompact(split.growth, locale)}
        delta={{direction: 'up', value: t('contributions.stats.earnedDelta')}}
      />
      <StatCard
        tone="gold"
        label={t('contributions.stats.shareLabel')}
        value={share(split.growthShare)}
        note={t('contributions.stats.shareNote')}
      />
    </StatRow>
  );

  const symbols: EquationSymbol[] = [
    {tex: 'V', meaning: t('contributions.eqSymV')},
    {tex: 'P', meaning: t('contributions.eqSymP')},
    {tex: 'C', meaning: t('contributions.eqSymC')},
    {tex: 'n', meaning: t('contributions.eqSymN')},
    {tex: 'G', meaning: t('contributions.eqSymG')}
  ];

  // The worked example is fixed at the long horizon (where growth overtakes deposits),
  // its numbers interpolated from the same builder so the prose can't drift.
  const example = buildContributionsSplit('long');

  return (
    <ChartCard
      title={t('contributions.title')}
      stats={stats}
      caption={t('contributions.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: horizon,
        onValueChange: (v) => setHorizon(v as Horizon),
        label: t('horizon.label'),
        options: HORIZON_OPTION_KEYS.map((key) => ({
          value: key,
          label: t(`horizon.${key}`)
        }))
      }}
      legend={legend}
      table={{
        caption: t('contributions.tableCaption'),
        columns: [
          {key: 'year', label: t('contributions.colYear')},
          {key: 'added', label: t('contributions.colAdded'), numeric: true},
          {key: 'earned', label: t('contributions.colEarned'), numeric: true},
          {key: 'total', label: t('contributions.colTotal'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('contributions.eqResult', {
          b: bold,
          years: String(HORIZON_YEARS.long),
          added: formatCHF(example.contributions, locale),
          earned: formatCHF(example.growth, locale),
          total: formatCHF(example.total, locale)
        }),
        showMathsLabel: t('showMaths'),
        formula: GROWTH_FORMULA,
        formulaAlt: t('contributions.eqFormulaAlt'),
        symbolsLabel: t('contributions.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('contributions.eqExampleLabel'),
        exampleFormula: GROWTH_EXAMPLE,
        exampleAlt: t('contributions.eqExampleAlt'),
        exampleCaption: t('contributions.eqExampleCaption'),
        whyLabel: t('contributions.eqWhyLabel'),
        why: t('contributions.eqWhy')
      }}
      mascot={
        <Sprout pose="coin-trail" size={88} decorative animated={false} eager />
      }
    >
      <ContributionsGrowthChart
        data={data}
        crossover={
          split.crossoverYear
            ? {year: split.crossoverYear, label: t('contributions.crossoverLabel')}
            : undefined
        }
        labels={labels}
        formatValue={(n) => formatCHF(n, locale)}
        formatAxisValue={(n) => formatCHFCompact(n, locale)}
        formatYear={(y) => t('contributions.tooltipYear', {year: String(y)})}
        ariaLabel={t('contributions.ariaLabel')}
      />
    </ChartCard>
  );
}

/* ===================== Wave C — "Your risk" (Slice 9) ===================== */

// Value-at-Risk (the 1-in-20 bad year) — the bad-year return is the average return
// minus about 1.65 risk-swings. Language-neutral (symbols + numbers); the example is
// the SHORT-horizon sample (μ 5.5%, σ ≈ 4.7% → about −2.2%), the default the card opens on.
const VAR_FORMULA = '\\text{VaR}_{95} = \\mu + z_{0.05}\\,\\sigma';
const VAR_EXAMPLE = '5.5\\% + (-1.645)\\times 4.7\\% \\approx -2.2\\%';

/** C1 — the return distribution: a bell of yearly returns with the worst-5% tail. */
function DistributionCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  // Default to short: the tail is visibly negative here, and toggling out to long shows
  // it pull back toward zero — the honest "time in the market narrows the range" story.
  const [horizon, setHorizon] = React.useState<Horizon>('short');

  const data = React.useMemo(() => buildReturnDistribution(horizon), [horizon]);

  const ret1 = (v: number) => formatPercent(v, locale, {maximumFractionDigits: 1});
  const chance = (v: number) => formatPercent(v, locale);

  const binWidth =
    data.bins.length > 1 ? data.bins[1].mid - data.bins[0].mid : 0.01;
  const tableRows = data.bins.map((b) => ({
    range: `${ret1(b.mid - binWidth / 2)} … ${ret1(b.mid + binWidth / 2)}`,
    chance: chance(b.mass)
  }));

  const legend: ChartCardLegendItem[] = [
    {shape: 'band', color: chartTheme.series[0], label: t('risk.distribution.legendTypical')},
    {shape: 'band', color: chartTheme.neg, label: t('risk.distribution.legendWorst')},
    {shape: 'dashed', color: chartTheme.annotation, label: t('risk.distribution.legendVar')},
    {shape: 'dashed', color: chartTheme.neg, label: t('risk.distribution.legendCvar')}
  ];

  // The card's own KPIs recast with the horizon (unlike the static-mix cards): the
  // 1-in-20 bad year and the average of that unlucky 5%, both from the same tail.
  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-2">
      <StatCard
        tone="neg"
        label={t('risk.distribution.stats.varLabel')}
        value={ret1(data.var95)}
        note={t('risk.distribution.stats.varNote')}
      />
      <StatCard
        tone="neg"
        label={t('risk.distribution.stats.cvarLabel')}
        value={ret1(data.cvar95)}
        note={t('risk.distribution.stats.cvarNote')}
      />
    </StatRow>
  );

  const symbols: EquationSymbol[] = [
    {tex: '\\mu', meaning: t('risk.distribution.eqSymMu')},
    {tex: '\\sigma', meaning: t('risk.distribution.eqSymSigma')},
    {tex: 'z_{0.05}', meaning: t('risk.distribution.eqSymZ')}
  ];

  return (
    <ChartCard
      title={t('risk.distribution.title')}
      stats={stats}
      caption={t('risk.distribution.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: horizon,
        onValueChange: (v) => setHorizon(v as Horizon),
        label: t('horizon.label'),
        options: HORIZON_OPTION_KEYS.map((key) => ({
          value: key,
          label: t(`horizon.${key}`)
        }))
      }}
      legend={legend}
      table={{
        caption: t('risk.distribution.tableCaption'),
        columns: [
          {key: 'range', label: t('risk.distribution.colRange')},
          {key: 'chance', label: t('risk.distribution.colChance'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('risk.distribution.eqResult', {
          b: bold,
          years: String(HORIZON_YEARS[horizon]),
          mean: ret1(data.mean),
          var: ret1(data.var95),
          cvar: ret1(data.cvar95)
        }),
        showMathsLabel: t('showMaths'),
        formula: VAR_FORMULA,
        formulaAlt: t('risk.distribution.eqFormulaAlt'),
        symbolsLabel: t('risk.distribution.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('risk.distribution.eqExampleLabel'),
        exampleFormula: VAR_EXAMPLE,
        exampleAlt: t('risk.distribution.eqExampleAlt'),
        exampleCaption: t('risk.distribution.eqExampleCaption'),
        whyLabel: t('risk.distribution.eqWhyLabel'),
        why: t('risk.distribution.eqWhy')
      }}
      mascot={
        <Sprout pose="balancing-beam" size={88} decorative animated={false} eager />
      }
    >
      <ReturnDistributionChart
        bins={data.bins}
        var={{value: data.var95, label: t('risk.distribution.varLabel')}}
        cvar={{value: data.cvar95, label: t('risk.distribution.cvarLabel')}}
        labels={{
          chance: t('risk.distribution.chance'),
          typical: t('risk.distribution.typical'),
          worst: t('risk.distribution.worst')
        }}
        formatReturn={ret1}
        formatChance={chance}
        ariaLabel={t('risk.distribution.ariaLabel')}
      />
    </ChartCard>
  );
}

/** C2 — the correlation heatmap: which holdings move together, which move apart. */
function CorrelationCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const matrix = buildCorrelationMatrix();

  const formatCorr = (v: number) =>
    formatDecimal(v, locale, {minimumFractionDigits: 2, maximumFractionDigits: 2});

  const describeCell = (
    a: CorrelationEntity,
    b: CorrelationEntity,
    value: number
  ) => t('risk.correlation.pairValue', {a: a.name, b: b.name, value: formatCorr(value)});

  // The table lists every distinct pair (the upper triangle), most-alike first.
  const pairs = matrix.cells
    .filter((c) => c.col > c.row)
    .sort((x, y) => y.value - x.value)
    .map((c) => {
      const a = matrix.entities[c.row];
      const b = matrix.entities[c.col];
      return {
        holding: a.name,
        with: b.name,
        corr: formatCorr(c.value),
        relation: t(`risk.correlation.${correlationRelation(c.value)}`)
      };
    });

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-2">
      <StatCard
        tone="brand"
        label={t('risk.correlation.stats.diversifyingLabel')}
        value={formatCorr(matrix.mostDiversifying.value)}
        note={t('risk.correlation.stats.diversifyingNote', {
          a: matrix.mostDiversifying.a.name,
          b: matrix.mostDiversifying.b.name
        })}
      />
      <StatCard
        tone="gold"
        label={t('risk.correlation.stats.concentratedLabel')}
        value={formatCorr(matrix.mostConcentrated.value)}
        note={t('risk.correlation.stats.concentratedNote', {
          a: matrix.mostConcentrated.a.name,
          b: matrix.mostConcentrated.b.name
        })}
      />
    </StatRow>
  );

  return (
    <ChartCard
      title={t('risk.correlation.title')}
      stats={stats}
      caption={t('risk.correlation.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      table={{
        caption: t('risk.correlation.tableCaption'),
        columns: [
          {key: 'holding', label: t('risk.correlation.colHolding')},
          {key: 'with', label: t('risk.correlation.colWith')},
          {key: 'corr', label: t('risk.correlation.colCorr'), numeric: true},
          {key: 'relation', label: t('risk.correlation.colRelation')}
        ],
        rows: pairs
      }}
      mascot={
        <Sprout pose="thinking" size={88} decorative animated={false} eager />
      }
    >
      <CorrelationHeatmap
        matrix={matrix}
        labels={{
          together: t('risk.correlation.together'),
          apart: t('risk.correlation.apart'),
          unrelated: t('risk.correlation.unrelated'),
          self: t('risk.correlation.self'),
          scaleApart: t('risk.correlation.scaleApart'),
          scaleTogether: t('risk.correlation.scaleTogether')
        }}
        formatCorr={formatCorr}
        describeCell={describeCell}
        ariaLabel={t('risk.correlation.ariaLabel')}
      />
    </ChartCard>
  );
}

/** C3 — risk contribution vs weight: where the plan's risk actually comes from. */
function ContributionCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const data = buildRiskContribution();
  const driver = topRiskDriver();
  const share = (v: number) => formatPercent(v, locale);
  const ratio = (v: number) =>
    `${formatDecimal(v, locale, {minimumFractionDigits: 1, maximumFractionDigits: 1})}×`;

  const legend: ChartCardLegendItem[] = [
    {shape: 'band', color: chartTheme.series[3], label: t('risk.contribution.legendWeight')},
    {shape: 'band', color: chartTheme.series[0], label: t('risk.contribution.legendRisk')}
  ];

  const tableRows = data.map((d) => ({
    holding: `${d.name} (${d.ticker})`,
    weight: share(d.weight),
    risk: share(d.risk),
    ratio: ratio(d.ratio)
  }));

  const stats = (
    <div className="max-w-sm">
      <StatCard
        tone="neg"
        label={t('risk.contribution.stats.driverLabel')}
        value={driver.name}
        note={t('risk.contribution.stats.driverNote', {
          risk: share(driver.risk),
          weight: share(driver.weight)
        })}
      />
    </div>
  );

  return (
    <ChartCard
      title={t('risk.contribution.title')}
      stats={stats}
      caption={t('risk.contribution.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('risk.contribution.tableCaption'),
        columns: [
          {key: 'holding', label: t('risk.contribution.colHolding')},
          {key: 'weight', label: t('risk.contribution.colWeight'), numeric: true},
          {key: 'risk', label: t('risk.contribution.colRisk'), numeric: true},
          {key: 'ratio', label: t('risk.contribution.colRatio'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="pointing" size={88} decorative animated={false} eager />
      }
    >
      <RiskContributionChart
        data={data}
        labels={{
          weight: t('risk.contribution.tipWeight'),
          risk: t('risk.contribution.tipRisk'),
          ratioSuffix: t('risk.contribution.ratioSuffix'),
          aboveWeight: t('risk.contribution.aboveWeight'),
          belowWeight: t('risk.contribution.belowWeight')
        }}
        formatShare={share}
        formatRatio={ratio}
        ariaLabel={t('risk.contribution.ariaLabel')}
      />
    </ChartCard>
  );
}

/** C4 — the efficient frontier: are you being paid for the risk you take? */
function FrontierCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const f = buildFrontier();
  const pct = (v: number) => formatPercent(v, locale, {maximumFractionDigits: 1});
  const dec2 = (v: number) =>
    formatDecimal(v, locale, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const signed2 = (v: number) =>
    formatDecimal(v, locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero'
    });

  const legend: ChartCardLegendItem[] = [
    {shape: 'line', color: chartTheme.frontier.curve, label: t('risk.frontier.legendLine')},
    {shape: 'dot', color: chartTheme.frontier.optimal, label: t('risk.frontier.optimal')},
    {shape: 'dot', color: chartTheme.frontier.you, label: t('risk.frontier.you')},
    {shape: 'dot', color: chartTheme.frontier.asset, label: t('risk.frontier.legendAsset')}
  ];

  const sharpe = (p: {return: number; risk: number}) =>
    p.risk > 0 ? p.return / p.risk : 0;

  const tableRows = [
    {
      point: t('risk.frontier.pointOptimal'),
      ret: pct(f.optimal.return),
      risk: pct(f.optimal.risk),
      sharpe: dec2(sharpe(f.optimal))
    },
    {
      point: t('risk.frontier.pointYou'),
      ret: pct(f.you.return),
      risk: pct(f.you.risk),
      sharpe: dec2(sharpe(f.you))
    },
    ...f.assets.map((a) => ({
      point: `${a.name} (${a.ticker})`,
      ret: pct(a.return),
      risk: pct(a.risk),
      sharpe: dec2(sharpe(a))
    }))
  ];

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-2">
      <StatCard
        tone="brand"
        label={t('risk.frontier.stats.sharpeLabel')}
        value={dec2(TILT_COST.tiltedSharpe)}
        delta={{
          direction: 'down',
          value: signed2(TILT_COST.tiltedSharpe - TILT_COST.optimalSharpe),
          label: t('risk.frontier.stats.vsOptimal')
        }}
      />
      <StatCard
        tone="gold"
        label={t('risk.frontier.stats.spotLabel')}
        value={pct(f.you.return)}
        note={t('risk.frontier.stats.spotNote')}
      />
    </StatRow>
  );

  return (
    <ChartCard
      title={t('risk.frontier.title')}
      stats={stats}
      caption={t('risk.frontier.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('risk.frontier.tableCaption'),
        columns: [
          {key: 'point', label: t('risk.frontier.colPoint')},
          {key: 'ret', label: t('risk.frontier.colReturn'), numeric: true},
          {key: 'risk', label: t('risk.frontier.colRisk'), numeric: true},
          {key: 'sharpe', label: t('risk.frontier.colSharpe'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="on-hilltop" size={88} decorative animated={false} eager />
      }
    >
      <EfficientFrontierChart
        curve={f.curve}
        optimal={f.optimal}
        you={f.you}
        assets={f.assets}
        labels={{
          optimal: t('risk.frontier.optimal'),
          you: t('risk.frontier.you'),
          riskRow: t('risk.frontier.riskRow'),
          returnRow: t('risk.frontier.returnRow'),
          riskAxis: t('risk.frontier.riskAxis'),
          returnAxis: t('risk.frontier.returnAxis')
        }}
        formatPct={pct}
        ariaLabel={t('risk.frontier.ariaLabel')}
      />
    </ChartCard>
  );
}

/* ===================== Wave D — "Your stocks" (Slice 9) ===================== */

/** D1 — the price history: a close-price line/area with a candlestick "advanced" toggle. */
function PriceHistoryCard({
  locale,
  className
}: {
  locale: string;
  className?: string;
}) {
  const t = useTranslations('Charts');
  const [range, setRange] = React.useState<StockRange>('1Y');
  const [mode, setMode] = React.useState<PriceHistoryMode>('line');

  const series = React.useMemo(() => buildPriceSeries(range), [range]);

  const price = (v: number) =>
    formatMoney(v, locale, STOCK.currency, {maximumFractionDigits: 2});
  const axisPrice = (v: number) =>
    formatMoney(v, locale, STOCK.currency, {maximumFractionDigits: 0});
  const signedPct = (v: number) =>
    formatPercent(v, locale, {maximumFractionDigits: 1, signDisplay: 'always'});

  // Locale-aware, SSR-deterministic date labels (UTC-pinned). The axis granularity
  // follows the range — day + month for the shorter views, month + year for "Max".
  const shortRange = range !== 'max';
  const axisDateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(`${locale}-CH`, {
        timeZone: 'UTC',
        ...(shortRange
          ? {day: 'numeric', month: 'short'}
          : {month: 'short', year: 'numeric'})
      }),
    [locale, shortRange]
  );
  const tipDateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(`${locale}-CH`, {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
    [locale]
  );
  const formatAxisDate = (ms: number) => axisDateFmt.format(ms);
  const formatTipDate = (ms: number) => tipDateFmt.format(ms);

  const up = series.changePct >= 0;

  const legend: ChartCardLegendItem[] = [
    {shape: 'line', color: chartTheme.price.line, label: t('stock.price.legendClose')},
    {shape: 'band', color: chartTheme.candle.up, label: t('stock.price.legendUp')},
    {shape: 'band', color: chartTheme.candle.down, label: t('stock.price.legendDown')}
  ];

  const tableRows = series.candles.map((c) => ({
    date: formatTipDate(c.date),
    open: price(c.open),
    high: price(c.high),
    low: price(c.low),
    close: price(c.close)
  }));

  const stats = (
    <StatRow className="max-w-2xl @2xl:grid-cols-3">
      <StatCard
        tone="brand"
        label={t('stock.price.stats.currentLabel')}
        value={price(series.last.close)}
        note={t('stock.price.stats.currentNote')}
      />
      <StatCard
        tone={up ? 'brand' : 'neg'}
        label={t('stock.price.stats.changeLabel', {
          range: t(`stock.price.range.${range}`)
        })}
        value={signedPct(series.changePct)}
        delta={{direction: up ? 'up' : 'down', value: price(series.changeAbs)}}
      />
      <StatCard
        tone="gold"
        label={t('stock.price.stats.rangeLabel')}
        value={
          <span className="whitespace-nowrap">{`${axisPrice(series.low)} – ${axisPrice(
            series.high
          )}`}</span>
        }
        note={t('stock.price.stats.rangeNote')}
      />
    </StatRow>
  );

  return (
    <ChartCard
      className={className}
      title={t('stock.price.title', {name: STOCK.name})}
      stats={stats}
      caption={t('stock.price.caption', {name: STOCK.name})}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: range,
        onValueChange: (v) => setRange(v as StockRange),
        label: t('horizon.label'),
        options: STOCK_RANGES.map((r) => ({
          value: r,
          label: t(`stock.price.range.${r}`)
        }))
      }}
      legend={legend}
      table={{
        caption: t('stock.price.tableCaption'),
        columns: [
          {key: 'date', label: t('stock.price.colDate')},
          {key: 'open', label: t('stock.price.colOpen'), numeric: true},
          {key: 'high', label: t('stock.price.colHigh'), numeric: true},
          {key: 'low', label: t('stock.price.colLow'), numeric: true},
          {key: 'close', label: t('stock.price.colClose'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="riding-wave" size={88} decorative animated={false} eager />
      }
    >
      <PriceHistoryChart
        points={series.points}
        candles={series.candles}
        mode={mode}
        onModeChange={setMode}
        modeLabels={{
          label: t('stock.price.modeLabel'),
          line: t('stock.price.modeLine'),
          candles: t('stock.price.modeCandles')
        }}
        labels={{
          open: t('stock.price.open'),
          high: t('stock.price.high'),
          low: t('stock.price.low'),
          close: t('stock.price.close')
        }}
        formatPrice={price}
        formatAxisPrice={axisPrice}
        formatAxisDate={formatAxisDate}
        formatTipDate={formatTipDate}
        ariaLabel={t('stock.price.ariaLabel', {name: STOCK.name})}
      />
    </ChartCard>
  );
}

/** D2 — analyst price targets: the low/mean/high consensus range + today + upside. */
function AnalystTargetCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const a = buildAnalystTargets();

  const price = (v: number) =>
    formatMoney(v, locale, STOCK.currency, {maximumFractionDigits: 0});
  const price2 = (v: number) =>
    formatMoney(v, locale, STOCK.currency, {maximumFractionDigits: 2});
  const signedPct = (v: number) =>
    formatPercent(v, locale, {maximumFractionDigits: 0, signDisplay: 'always'});

  const up = a.mean >= a.current;
  const toPct = (target: number) => target / a.current - 1;

  const legend: ChartCardLegendItem[] = [
    {shape: 'band', color: 'var(--green-300)', label: t('stock.analyst.legendRange')},
    {shape: 'dot', color: chartTheme.analyst.mean, label: t('stock.analyst.legendConsensus')},
    {shape: 'dot', color: chartTheme.analyst.current, label: t('stock.analyst.legendToday')}
  ];

  const tableRows = [
    {point: t('stock.analyst.rowLow'), price: price2(a.low), vs: signedPct(toPct(a.low))},
    {
      point: t('stock.analyst.rowConsensus'),
      price: price2(a.mean),
      vs: signedPct(toPct(a.mean))
    },
    {point: t('stock.analyst.rowHigh'), price: price2(a.high), vs: signedPct(toPct(a.high))},
    {point: t('stock.analyst.rowToday'), price: price2(a.current), vs: '—'}
  ];

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone={up ? 'brand' : 'neg'}
        label={t('stock.analyst.stats.consensusLabel')}
        value={price(a.mean)}
        delta={{
          direction: up ? 'up' : 'down',
          value: signedPct(a.upside),
          label: t('stock.analyst.stats.consensusDelta')
        }}
      />
      <StatCard
        tone="neutral"
        label={t('stock.analyst.stats.rangeLabel')}
        value={
          <span className="whitespace-nowrap">{`${price(a.low)} – ${price(a.high)}`}</span>
        }
        note={t('stock.analyst.stats.rangeNote')}
      />
      <StatCard
        tone="sky"
        label={t('stock.analyst.stats.countLabel')}
        value={formatNumber(a.count, locale)}
        note={t('stock.analyst.stats.countNote')}
      />
    </StatRow>
  );

  return (
    <ChartCard
      title={t('stock.analyst.title', {name: STOCK.name})}
      stats={stats}
      caption={t('stock.analyst.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('stock.analyst.tableCaption'),
        columns: [
          {key: 'point', label: t('stock.analyst.colPoint')},
          {key: 'price', label: t('stock.analyst.colPrice'), numeric: true},
          {key: 'vs', label: t('stock.analyst.colVs'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="catching-star" size={88} decorative animated={false} eager />
      }
    >
      <AnalystTargetChart
        current={a.current}
        low={a.low}
        mean={a.mean}
        high={a.high}
        labels={{
          today: t('stock.analyst.today'),
          low: t('stock.analyst.low'),
          consensus: t('stock.analyst.consensus'),
          high: t('stock.analyst.high'),
          upside: t('stock.analyst.upside'),
          downside: t('stock.analyst.downside')
        }}
        formatPrice={price2}
        formatUpside={signedPct}
        ariaLabel={t('stock.analyst.ariaLabel', {name: STOCK.name})}
      />
    </ChartCard>
  );
}

/** D3 — the fundamentals snapshot: the real facts (market cap, beta, quality flags). */
function FundamentalsCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const f = buildFundamentals();

  const price = (v: number) =>
    formatMoney(v, locale, STOCK.currency, {maximumFractionDigits: 2});
  const cap = (v: number) => formatMoneyCompact(v, locale, STOCK.currency);
  const mult = (v: number) =>
    `${formatDecimal(v, locale, {minimumFractionDigits: 1, maximumFractionDigits: 1})}×`;
  const yesNo = (on: boolean) =>
    on ? t('stock.fundamentals.yes') : t('stock.fundamentals.no');

  const betaLabel = mult(f.beta);

  const flags = [
    {label: t('stock.fundamentals.flagProfitable'), on: f.isProfitable},
    {label: t('stock.fundamentals.flagDividend'), on: f.paysDividend},
    {label: t('stock.fundamentals.flagIndex', {index: f.indexName}), on: f.isIndexMember}
  ];

  const tableRows = [
    {fact: t('stock.fundamentals.rowPrice'), value: price(f.currentPrice)},
    {fact: t('stock.fundamentals.rowCap'), value: cap(f.marketCap)},
    {fact: t('stock.fundamentals.rowBeta'), value: betaLabel},
    {
      fact: t('stock.fundamentals.rowListed'),
      value: t('stock.fundamentals.listedValue', {
        year: String(f.firstTradeYear),
        years: f.yearsListed
      })
    },
    {fact: t('stock.fundamentals.flagProfitable'), value: yesNo(f.isProfitable)},
    {fact: t('stock.fundamentals.flagDividend'), value: yesNo(f.paysDividend)},
    {
      fact: t('stock.fundamentals.flagIndex', {index: f.indexName}),
      value: yesNo(f.isIndexMember)
    }
  ];

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="brand"
        label={t('stock.fundamentals.stats.capLabel')}
        value={cap(f.marketCap)}
        note={t('stock.fundamentals.stats.capNote')}
      />
      <StatCard
        tone="gold"
        label={t('stock.fundamentals.stats.betaLabel')}
        value={betaLabel}
        note={t('stock.fundamentals.stats.betaNote')}
      />
      <StatCard
        tone="sky"
        label={t('stock.fundamentals.stats.listedLabel')}
        value={String(f.firstTradeYear)}
        note={t('stock.fundamentals.stats.listedNote', {years: f.yearsListed})}
      />
    </StatRow>
  );

  return (
    <ChartCard
      title={t('stock.fundamentals.title', {name: STOCK.name})}
      stats={stats}
      caption={t('stock.fundamentals.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      table={{
        caption: t('stock.fundamentals.tableCaption'),
        columns: [
          {key: 'fact', label: t('stock.fundamentals.colFact')},
          {key: 'value', label: t('stock.fundamentals.colValue'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="reading" size={88} decorative animated={false} eager />
      }
    >
      <FundamentalsSnapshot
        beta={f.beta}
        betaMarket={f.betaMarket}
        betaLabel={betaLabel}
        betaTitle={t('stock.fundamentals.betaTitle')}
        marketLabel={t('stock.fundamentals.market', {value: mult(f.betaMarket)})}
        betaCaption={t('stock.fundamentals.betaCaption', {beta: betaLabel})}
        flags={flags}
        ariaLabel={t('stock.fundamentals.ariaLabel', {name: STOCK.name})}
      />
    </ChartCard>
  );
}

/* ============== Wave E — "Scenario & comparison" (Slice 9) ============== */

/** E1 — how a bad year could feel: rough-year loss bars, your mix vs a plain index. */
function StressBarsCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const summary = buildStressBars();
  const signedPct = (v: number) =>
    formatPercent(v, locale, {maximumFractionDigits: 1, signDisplay: 'always'});
  const pts = (v: number) => formatPercent(v, locale, {maximumFractionDigits: 1});
  const sevLabel = (s: StressSeverity) => t(`scenario.stress.sev.${s}`);
  const sevShort = (s: StressSeverity) => t(`scenario.stress.sevShort.${s}`);

  const data: StressBarDatum[] = summary.bars.map((b) => ({
    key: b.severity,
    severity: sevShort(b.severity),
    severityFull: sevLabel(b.severity),
    yourLoss: b.yourLoss,
    indexLoss: b.indexLoss,
    cushion: b.cushion
  }));

  const legend: ChartCardLegendItem[] = [
    {shape: 'band', color: chartTheme.scenario.loss, label: t('scenario.stress.legendIndex')},
    {shape: 'band', color: chartTheme.scenario.cushioned, label: t('scenario.stress.legendYou')}
  ];

  const tableRows = summary.bars.map((b) => ({
    scenario: sevLabel(b.severity),
    index: signedPct(b.indexLoss),
    you: signedPct(b.yourLoss),
    cushion: pts(b.cushion)
  }));

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="neg"
        label={t('scenario.stress.stats.worstLabel')}
        value={signedPct(summary.worstYearLoss)}
        note={t('scenario.stress.stats.worstNote')}
      />
      <StatCard
        tone="brand"
        label={t('scenario.stress.stats.cushionLabel')}
        value={pts(summary.headlineCushion)}
        delta={{direction: 'up', value: t('scenario.stress.stats.cushionPill')}}
      />
      <StatCard
        tone="gold"
        label={t('scenario.stress.stats.severeLabel')}
        value={signedPct(summary.severeLoss)}
        note={t('scenario.stress.stats.severeNote')}
      />
    </StatRow>
  );

  const symbols: EquationSymbol[] = [
    {tex: '\\text{loss}', meaning: t('scenario.stress.eqSymLoss')},
    {tex: '\\mu', meaning: t('scenario.stress.eqSymMu')},
    {tex: 'z', meaning: t('scenario.stress.eqSymZ')},
    {tex: '\\sigma', meaning: t('scenario.stress.eqSymSigma')}
  ];

  return (
    <ChartCard
      title={t('scenario.stress.title')}
      stats={stats}
      caption={t('scenario.stress.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('scenario.stress.tableCaption'),
        columns: [
          {key: 'scenario', label: t('scenario.stress.colScenario')},
          {key: 'index', label: t('scenario.stress.colIndex'), numeric: true},
          {key: 'you', label: t('scenario.stress.colYou'), numeric: true},
          {key: 'cushion', label: t('scenario.stress.colCushion'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('scenario.stress.eqResult', {
          b: bold,
          loss: signedPct(summary.worstYearLoss),
          cushion: pts(summary.headlineCushion)
        }),
        showMathsLabel: t('showMaths'),
        formula: STRESS_FORMULA,
        formulaAlt: t('scenario.stress.eqFormulaAlt'),
        symbolsLabel: t('scenario.stress.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('scenario.stress.eqExampleLabel'),
        exampleFormula: STRESS_EXAMPLE,
        exampleAlt: t('scenario.stress.eqExampleAlt'),
        exampleCaption: t('scenario.stress.eqExampleCaption'),
        whyLabel: t('scenario.stress.eqWhyLabel'),
        why: t('scenario.stress.eqWhy')
      }}
      mascot={
        <Sprout pose="calm" size={88} decorative animated={false} eager />
      }
    >
      <StressBarsChart
        data={data}
        labels={{
          index: t('scenario.stress.legendIndex'),
          your: t('scenario.stress.legendYou'),
          cushion: t('scenario.stress.tipCushion'),
          waterline: t('scenario.stress.waterline')
        }}
        formatPercent={signedPct}
        formatCushion={(v) =>
          t('scenario.stress.cushionValue', {pct: pts(v)})
        }
        ariaLabel={t('scenario.stress.ariaLabel')}
      />
    </ChartCard>
  );
}

/** E2 — rolling returns: the annualised-return band narrowing as the hold grows. */
function RollingReturnsCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const summary = buildRolling();
  const signedPct = (v: number) =>
    formatPercent(v, locale, {maximumFractionDigits: 1, signDisplay: 'always'});
  const pct = (v: number) => formatPercent(v, locale, {maximumFractionDigits: 1});
  const wholeYears = (y: number) => formatNumber(Math.round(y), locale);
  const yearsAxis = (y: number) =>
    t('scenario.rolling.yearsAxis', {years: wholeYears(y)});
  const yearsTitle = (y: number) =>
    t('scenario.rolling.yearsTitle', {years: wholeYears(y)});
  const breakevenYears = Math.round(summary.breakevenYears);

  const short = summary.marks[0]; // 1 year
  const long = summary.marks[3]; // 10 years

  const legend: ChartCardLegendItem[] = [
    {shape: 'line', color: chartTheme.scenario.median, label: t('scenario.rolling.legendMedian')},
    {shape: 'band', color: chartTheme.scenario.band, label: t('scenario.rolling.legendBand')},
    {shape: 'dot', color: chartTheme.scenario.median, label: t('scenario.rolling.legendBreakeven')}
  ];

  const tableRows = summary.marks.map((m) => ({
    hold: yearsTitle(m.years),
    rough: signedPct(m.p10),
    median: signedPct(m.median),
    good: signedPct(m.p90)
  }));

  const range = (p: {p10: number; p90: number}) => (
    <span className="whitespace-nowrap">{`${signedPct(p.p10)} … ${signedPct(p.p90)}`}</span>
  );

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="neg"
        label={t('scenario.rolling.stats.shortLabel')}
        value={range(short)}
        note={t('scenario.rolling.stats.shortNote')}
      />
      <StatCard
        tone="brand"
        label={t('scenario.rolling.stats.longLabel')}
        value={range(long)}
        note={t('scenario.rolling.stats.longNote')}
      />
      <StatCard
        tone="gold"
        label={t('scenario.rolling.stats.breakevenLabel')}
        value={t('scenario.rolling.stats.breakevenValue', {
          years: formatNumber(breakevenYears, locale)
        })}
        note={t('scenario.rolling.stats.breakevenNote')}
      />
    </StatRow>
  );

  const symbols: EquationSymbol[] = [
    {tex: '\\sigma_n', meaning: t('scenario.rolling.eqSymSigmaN')},
    {tex: '\\sigma', meaning: t('scenario.rolling.eqSymSigma')},
    {tex: 'n', meaning: t('scenario.rolling.eqSymN')}
  ];

  return (
    <ChartCard
      title={t('scenario.rolling.title')}
      stats={stats}
      caption={t('scenario.rolling.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      legend={legend}
      table={{
        caption: t('scenario.rolling.tableCaption'),
        columns: [
          {key: 'hold', label: t('scenario.rolling.colHold')},
          {key: 'rough', label: t('scenario.rolling.colRough'), numeric: true},
          {key: 'median', label: t('scenario.rolling.colMedian'), numeric: true},
          {key: 'good', label: t('scenario.rolling.colGood'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('scenario.rolling.eqResult', {
          b: bold,
          mean: signedPct(summary.mean),
          sigma1: pct(summary.oneYearSigma),
          sigma10: pct(summary.tenYearSigma),
          years: formatNumber(breakevenYears, locale)
        }),
        showMathsLabel: t('showMaths'),
        formula: ROLLING_FORMULA,
        formulaAlt: t('scenario.rolling.eqFormulaAlt'),
        symbolsLabel: t('scenario.rolling.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('scenario.rolling.eqExampleLabel'),
        exampleFormula: ROLLING_EXAMPLE,
        exampleAlt: t('scenario.rolling.eqExampleAlt'),
        exampleCaption: t('scenario.rolling.eqExampleCaption'),
        whyLabel: t('scenario.rolling.eqWhyLabel'),
        why: t('scenario.rolling.eqWhy')
      }}
      mascot={
        <Sprout pose="balancing-beam" size={88} decorative animated={false} eager />
      }
    >
      <RollingReturnsChart
        data={summary.curve}
        breakeven={{
          years: summary.breakevenYears,
          label: t('scenario.rolling.breakevenMarker', {
            years: formatNumber(breakevenYears, locale)
          })
        }}
        breakevenRuleLabel={t('scenario.rolling.breakevenRule')}
        labels={{
          median: t('scenario.rolling.tipMedian'),
          good: t('scenario.rolling.tipGood'),
          rough: t('scenario.rolling.tipRough')
        }}
        formatReturn={signedPct}
        formatYears={yearsTitle}
        formatYearsAxis={yearsAxis}
        ariaLabel={t('scenario.rolling.ariaLabel')}
      />
    </ChartCard>
  );
}

/** E3 — benchmark comparison: your expected path vs a 60/40 reference, recast by horizon. */
function BenchmarkCard({
  locale,
  className
}: {
  locale: string;
  className?: string;
}) {
  const t = useTranslations('Charts');
  // Default to long: the compounding edge (and the gap) is largest over 30 years.
  const [horizon, setHorizon] = React.useState<Horizon>('long');
  const data = React.useMemo(() => buildBenchmark(horizon), [horizon]);
  const chf = (v: number) => formatCHF(v, locale);
  const chfC = (v: number) => formatCHFCompact(v, locale);
  const pct1 = (v: number) => formatPercent(v, locale, {maximumFractionDigits: 1});

  const legend: ChartCardLegendItem[] = [
    {shape: 'line', color: chartTheme.scenario.you, label: t('scenario.benchmark.legendYou')},
    {shape: 'dashed', color: chartTheme.scenario.reference, label: t('scenario.benchmark.legendReference')},
    {shape: 'band', color: chartTheme.scenario.gap, label: t('scenario.benchmark.legendGap')}
  ];

  const tableRows = data.points.map((p) => ({
    year: String(p.year),
    you: chf(p.you),
    reference: chf(p.reference),
    gap: chf(p.gap)
  }));

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="brand"
        label={t('scenario.benchmark.stats.youLabel', {year: String(data.targetYear)})}
        value={chf(data.yourFinal)}
        note={t('scenario.benchmark.stats.youNote', {ret: pct1(data.yourReturn)})}
      />
      <StatCard
        tone="neutral"
        label={t('scenario.benchmark.stats.refLabel')}
        value={chf(data.referenceFinal)}
        note={t('scenario.benchmark.stats.refNote', {ret: pct1(data.referenceReturn)})}
      />
      <StatCard
        tone="gold"
        label={t('scenario.benchmark.stats.gapLabel')}
        value={chfC(data.gap)}
        delta={{direction: 'up', value: t('scenario.benchmark.stats.gapPill')}}
      />
    </StatRow>
  );

  const symbols: EquationSymbol[] = [
    {tex: 'FV', meaning: t('scenario.benchmark.eqSymFV')},
    {tex: 'P', meaning: t('scenario.benchmark.eqSymP')},
    {tex: 'C', meaning: t('scenario.benchmark.eqSymC')},
    {tex: 'r', meaning: t('scenario.benchmark.eqSymR')},
    {tex: 'n', meaning: t('scenario.benchmark.eqSymN')}
  ];

  // The worked example is fixed at the long horizon (the richest gap, like the projection
  // card's fixed example), so the maths text can't drift when the horizon toggles.
  const example = buildBenchmark('long');

  return (
    <ChartCard
      className={className}
      title={t('scenario.benchmark.title')}
      stats={stats}
      caption={t('scenario.benchmark.caption')}
      viewLabels={{
        chart: t('viewChart'),
        table: t('viewTable'),
        group: t('viewGroup')
      }}
      horizon={{
        value: horizon,
        onValueChange: (v) => setHorizon(v as Horizon),
        label: t('horizon.label'),
        options: HORIZON_OPTION_KEYS.map((key) => ({
          value: key,
          label: t(`horizon.${key}`)
        }))
      }}
      legend={legend}
      table={{
        caption: t('scenario.benchmark.tableCaption'),
        columns: [
          {key: 'year', label: t('scenario.benchmark.colYear')},
          {key: 'you', label: t('scenario.benchmark.colYou'), numeric: true},
          {key: 'reference', label: t('scenario.benchmark.colReference'), numeric: true},
          {key: 'gap', label: t('scenario.benchmark.colGap'), numeric: true}
        ],
        rows: tableRows
      }}
      maths={{
        result: t.rich('scenario.benchmark.eqResult', {
          b: bold,
          year: String(example.targetYear),
          gap: chf(example.gap),
          yourReturn: pct1(example.yourReturn),
          refReturn: pct1(example.referenceReturn)
        }),
        showMathsLabel: t('showMaths'),
        formula: FV_FORMULA,
        formulaAlt: t('scenario.benchmark.eqFormulaAlt'),
        symbolsLabel: t('scenario.benchmark.eqSymbolsLabel'),
        symbols,
        exampleLabel: t('scenario.benchmark.eqExampleLabel'),
        exampleFormula: FV_EXAMPLE,
        exampleAlt: t('scenario.benchmark.eqExampleAlt'),
        exampleCaption: t('scenario.benchmark.eqExampleCaption'),
        whyLabel: t('scenario.benchmark.eqWhyLabel'),
        why: t('scenario.benchmark.eqWhy')
      }}
      mascot={
        <Sprout pose="growth-arrow" size={88} decorative animated={false} eager />
      }
    >
      <BenchmarkLinesChart
        data={data.points}
        end={{
          year: data.targetYear,
          you: data.yourFinal,
          label: t('scenario.benchmark.endLabel', {gap: chfC(data.gap)})
        }}
        labels={{
          you: t('scenario.benchmark.tipYou'),
          reference: t('scenario.benchmark.tipReference'),
          gap: t('scenario.benchmark.tipGap')
        }}
        formatValue={chf}
        formatAxisValue={chfC}
        formatYear={(y) => t('scenario.benchmark.tooltipYear', {year: String(y)})}
        ariaLabel={t('scenario.benchmark.ariaLabel')}
      />
    </ChartCard>
  );
}

/* ============== Wave F — "Tables, first-class" (Slice 9) ============== */

/** Shared view-switch labels for the Wave-F cards: the rich "Visual" presentation vs the
 *  plain "Table" fallback (these cards aren't charts, so "Chart"/"Table" wouldn't read). */
function useTableViewLabels() {
  const t = useTranslations('Charts');
  return {
    chart: t('tables.viewVisual'),
    table: t('tables.viewPlain'),
    group: t('tables.viewGroup')
  };
}

/** F1 — the sortable holdings table: every holding with weight, risk, and a trend spark. */
function HoldingsCard({
  locale,
  className
}: {
  locale: string;
  className?: string;
}) {
  const t = useTranslations('Charts');
  const viewLabels = useTableViewLabels();
  const share = (v: number) => formatPercent(v, locale);
  const signed1 = (v: number) =>
    formatPercent(v, locale, {maximumFractionDigits: 1, signDisplay: 'always'});
  const glyph = (dir: HoldingRow['trendDir']) =>
    dir === 'up' ? '▲' : dir === 'down' ? '▼' : '→';
  const trendCls = (dir: HoldingRow['trendDir']) =>
    dir === 'up' ? 'text-pos' : dir === 'down' ? 'text-neg' : 'text-text-muted';

  const holdings = buildHoldings();

  // Map the sample rows → the component's own row type, resolving the localised type +
  // role labels here (i18n stays in the page; the component stays prop-driven + reusable).
  const rows: HoldingsTableRow[] = holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    typeLabel: t(`mix.assetClass.${h.assetClass}`),
    roleLabel: t(`tables.role.${h.role}`),
    role: h.role,
    sleeve: h.sleeve,
    weight: h.weight,
    risk: h.riskContribution,
    spark: h.spark,
    trendPct: h.trendPct,
    trendDir: h.trendDir
  }));

  // The plain-table fallback: the same numbers as static text (trend as a signed % with a
  // ▲/▼ glyph + tone, never colour-alone), ordered by weight like the table's default sort.
  const tableRows = [...holdings]
    .sort((a, b) => b.weight - a.weight)
    .map((h) => ({
      holding: `${h.name} (${h.ticker})`,
      type: t(`mix.assetClass.${h.assetClass}`),
      weight: share(h.weight),
      risk: share(h.riskContribution),
      trend: (
        <span className={`nums ${trendCls(h.trendDir)}`}>
          <span aria-hidden className="mr-0.5">
            {glyph(h.trendDir)}
          </span>
          {signed1(h.trendPct)}
        </span>
      )
    }));

  // KPI header: the biggest position, the count, and the core-vs-satellite split — all
  // derived from the same rows so they can't drift from the table.
  const biggest = holdings.reduce((a, b) => (b.weight > a.weight ? b : a));
  const coreShare = holdings
    .filter((h) => h.role === 'core')
    .reduce((acc, h) => acc + h.weight, 0);
  const satelliteShare = 1 - coreShare;

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="brand"
        label={t('tables.holdings.stats.biggestLabel')}
        value={biggest.name}
        note={t('tables.holdings.stats.biggestNote', {weight: share(biggest.weight)})}
      />
      <StatCard
        tone="sky"
        label={t('tables.holdings.stats.countLabel')}
        value={formatNumber(holdings.length, locale)}
        note={t('tables.holdings.stats.countNote')}
      />
      <StatCard
        tone="gold"
        label={t('tables.holdings.stats.splitLabel')}
        value={`${share(coreShare)} / ${share(satelliteShare)}`}
        note={t('tables.holdings.stats.splitNote')}
      />
    </StatRow>
  );

  return (
    <ChartCard
      className={className}
      title={t('tables.holdings.title')}
      stats={stats}
      caption={t('tables.holdings.caption')}
      viewLabels={viewLabels}
      table={{
        caption: t('tables.holdings.tableCaption'),
        columns: [
          {key: 'holding', label: t('tables.holdings.colHolding')},
          {key: 'type', label: t('tables.holdings.colType')},
          {key: 'weight', label: t('tables.holdings.colWeight'), numeric: true},
          {key: 'risk', label: t('tables.holdings.colRisk'), numeric: true},
          {key: 'trend', label: t('tables.holdings.colTrend'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="pointing" size={88} decorative animated={false} eager />
      }
    >
      <HoldingsTable
        rows={rows}
        labels={{
          colHolding: t('tables.holdings.colHolding'),
          colType: t('tables.holdings.colType'),
          colWeight: t('tables.holdings.colWeight'),
          colRisk: t('tables.holdings.colRisk'),
          colTrend: t('tables.holdings.colTrend')
        }}
        formatWeight={share}
        formatRisk={share}
        formatTrend={signed1}
        sortByLabel={(column) => t('tables.sortBy', {column})}
        ariaLabel={t('tables.holdings.ariaLabel')}
      />
    </ChartCard>
  );
}

/** F2 — where your money sits: exposure by investment type (asset class), ranked. */
function ExposureCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const viewLabels = useTableViewLabels();
  const share = (v: number) => formatPercent(v, locale);
  const count = (v: number) => formatNumber(v, locale);

  const exposure = buildExposure();

  const rows: ExposureTableRow[] = exposure.map((e) => ({
    key: e.assetClass,
    typeLabel: t(`mix.assetClass.${e.assetClass}`),
    sleeve: e.sleeve,
    share: e.share,
    holdingCount: e.holdingCount
  }));

  const tableRows = exposure.map((e) => ({
    type: t(`mix.assetClass.${e.assetClass}`),
    share: share(e.share),
    holdings: count(e.holdingCount)
  }));

  // KPI header: the biggest exposure, the number of distinct types, and the growth
  // (equity) share — all derived from the same ranked rows.
  const biggest = exposure[0];
  const equityShare = exposure
    .filter((e) => e.sleeve === 'equity')
    .reduce((acc, e) => acc + e.share, 0);

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="brand"
        label={t('tables.exposure.stats.biggestLabel')}
        value={t(`mix.assetClass.${biggest.assetClass}`)}
        note={t('tables.exposure.stats.biggestNote', {share: share(biggest.share)})}
      />
      <StatCard
        tone="sky"
        label={t('tables.exposure.stats.typesLabel')}
        value={formatNumber(exposure.length, locale)}
        note={t('tables.exposure.stats.typesNote')}
      />
      <StatCard
        tone="gold"
        label={t('tables.exposure.stats.equityLabel')}
        value={share(equityShare)}
        note={t('tables.exposure.stats.equityNote')}
      />
    </StatRow>
  );

  return (
    <ChartCard
      title={t('tables.exposure.title')}
      stats={stats}
      caption={t('tables.exposure.caption')}
      viewLabels={viewLabels}
      table={{
        caption: t('tables.exposure.tableCaption'),
        columns: [
          {key: 'type', label: t('tables.exposure.colType')},
          {key: 'share', label: t('tables.exposure.colShare'), numeric: true},
          {key: 'holdings', label: t('tables.exposure.colHoldings'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="with-pie-chart" size={88} decorative animated={false} eager />
      }
    >
      <ExposureTable
        rows={rows}
        labels={{
          colType: t('tables.exposure.colType'),
          colShare: t('tables.exposure.colShare'),
          colHoldings: t('tables.exposure.colHoldings')
        }}
        formatShare={share}
        formatCount={count}
        ariaLabel={t('tables.exposure.ariaLabel')}
      />
    </ChartCard>
  );
}

/** F3 — which holdings pay you: income character (distributes cash vs reinvests). */
function IncomeCard({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const viewLabels = useTableViewLabels();
  const share = (v: number) => formatPercent(v, locale);

  const income = buildIncome();

  const distributes: IncomeGroup = {
    label: t('tables.income.distributesLabel'),
    share: income.distributesShare,
    holdings: income.distributes.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      sleeve: r.sleeve,
      weight: r.weight
    }))
  };
  const reinvests: IncomeGroup = {
    label: t('tables.income.reinvestsLabel'),
    share: income.reinvestsShare,
    holdings: income.reinvests.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      sleeve: r.sleeve,
      weight: r.weight
    }))
  };

  // The plain-table fallback: every holding, its income character, and its weight.
  const tableRows = [...income.distributes, ...income.reinvests].map((r) => ({
    holding: `${r.name} (${r.ticker})`,
    character:
      r.character === 'distributes'
        ? t('tables.income.distributesShort')
        : t('tables.income.reinvestsShort'),
    weight: share(r.weight)
  }));

  const stats = (
    <StatRow className="max-w-xl @2xl:grid-cols-3">
      <StatCard
        tone="gold"
        label={t('tables.income.stats.payingLabel')}
        value={share(income.distributesShare)}
        note={t('tables.income.stats.payingNote')}
      />
      <StatCard
        tone="brand"
        label={t('tables.income.stats.reinvestLabel')}
        value={share(income.reinvestsShare)}
        note={t('tables.income.stats.reinvestNote')}
      />
      <StatCard
        tone="sky"
        label={t('tables.income.stats.payersLabel')}
        value={formatNumber(income.distributesCount, locale)}
        note={t('tables.income.stats.payersNote')}
      />
    </StatRow>
  );

  return (
    <ChartCard
      title={t('tables.income.title')}
      stats={stats}
      caption={t('tables.income.caption')}
      viewLabels={viewLabels}
      table={{
        caption: t('tables.income.tableCaption'),
        columns: [
          {key: 'holding', label: t('tables.income.colHolding')},
          {key: 'character', label: t('tables.income.colCharacter')},
          {key: 'weight', label: t('tables.income.colWeight'), numeric: true}
        ],
        rows: tableRows
      }}
      mascot={
        <Sprout pose="coin-trail" size={88} decorative animated={false} eager />
      }
    >
      <IncomeSplit
        distributes={distributes}
        reinvests={reinvests}
        labels={{
          barAria: t('tables.income.barAria', {
            income: share(income.distributesShare),
            reinvest: share(income.reinvestsShare)
          })
        }}
        formatShare={share}
        formatWeight={share}
        ariaLabel={t('tables.income.ariaLabel')}
      />
    </ChartCard>
  );
}

export function ChartsDemo({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  // The denser "premium dashboard" composition (DESIGN §6 research mode): a KPI stat
  // strip on top, then the catalogue in labelled sections, each a 2-up ChartGrid. Each
  // card stays fully interactive (its own toggles + maths); the calm guided flow never
  // uses this layout. `data-demo-section` gives the e2e a stable handle per section.
  return (
    <div className="space-y-12">
      <PlanGlance locale={locale} />

      <section data-demo-section="mix" className="space-y-4">
        <div className="max-w-prose space-y-1.5">
          <h2 className="text-h2 text-ink">{t('mix.sectionTitle')}</h2>
          <p className="text-body text-text">{t('mix.sectionIntro')}</p>
        </div>
        <ChartGrid>
          <DonutCard locale={locale} />
          <SunburstCard locale={locale} />
          <TreemapCard locale={locale} />
          <OptimalCard locale={locale} />
        </ChartGrid>
      </section>

      <section data-demo-section="growth" className="space-y-4">
        <div className="max-w-prose space-y-1.5">
          <h2 className="text-h2 text-ink">{t('growthSectionTitle')}</h2>
          <p className="text-body text-text">{t('growthSectionIntro')}</p>
        </div>
        {/* Appended AFTER the fan + drawdown so the existing 8a/8b e2e keep their
            nth(0)/nth(1) handles; the two Wave B cards are nth(2)/nth(3). */}
        <ChartGrid>
          <ProjectionCard locale={locale} />
          <DrawdownCard locale={locale} />
          <GoalFundingCard locale={locale} />
          <ContributionsCard locale={locale} />
        </ChartGrid>
      </section>

      <section data-demo-section="risk" className="space-y-4">
        <div className="max-w-prose space-y-1.5">
          <h2 className="text-h2 text-ink">{t('riskSectionTitle')}</h2>
          <p className="text-body text-text">{t('riskSectionIntro')}</p>
        </div>
        <ChartGrid>
          <DistributionCard locale={locale} />
          <CorrelationCard locale={locale} />
          <ContributionCard locale={locale} />
          <FrontierCard locale={locale} />
        </ChartGrid>
      </section>

      <section data-demo-section="stock" className="space-y-4">
        <div className="max-w-prose space-y-1.5">
          <h2 className="text-h2 text-ink">{t('stockSectionTitle')}</h2>
          <p className="text-body text-text">{t('stockSectionIntro')}</p>
        </div>
        {/* The price time-series leads full-width (it earns the room); the analyst
            targets + fundamentals sit 2-up beneath it. */}
        <ChartGrid>
          <PriceHistoryCard locale={locale} className="lg:col-span-2" />
          <AnalystTargetCard locale={locale} />
          <FundamentalsCard locale={locale} />
        </ChartGrid>
      </section>

      <section data-demo-section="scenario" className="space-y-4">
        <div className="max-w-prose space-y-1.5">
          <h2 className="text-h2 text-ink">{t('scenarioSectionTitle')}</h2>
          <p className="text-body text-text">{t('scenarioSectionIntro')}</p>
        </div>
        {/* The forward benchmark comparison leads full-width (a 30-year time series earns
            the room); the two "scenario" cards sit 2-up beneath it. Benchmark is card
            nth(0) (it carries the horizon toggle for the e2e full cycle); stress = nth(1),
            rolling = nth(2). */}
        <ChartGrid>
          <BenchmarkCard locale={locale} className="lg:col-span-2" />
          <StressBarsCard locale={locale} />
          <RollingReturnsCard locale={locale} />
        </ChartGrid>
      </section>

      <section data-demo-section="tables" className="space-y-4">
        <div className="max-w-prose space-y-1.5">
          <h2 className="text-h2 text-ink">{t('tablesSectionTitle')}</h2>
          <p className="text-body text-text">{t('tablesSectionIntro')}</p>
        </div>
        {/* The sortable holdings table leads full-width (its five columns earn the room);
            the exposure + income tables sit 2-up beneath it. Holdings is card nth(0), the
            exposure table nth(1), the income split nth(2). */}
        <ChartGrid>
          <HoldingsCard locale={locale} className="lg:col-span-2" />
          <ExposureCard locale={locale} />
          <IncomeCard locale={locale} />
        </ChartGrid>
      </section>
    </div>
  );
}
