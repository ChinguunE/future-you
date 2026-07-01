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
import {Sprout} from '@/components/illustration/Sprout';
import type {EquationSymbol} from '@/components/ui/equation-block';
import {chartTheme} from '@/lib/chart-theme';
import {
  formatCHF,
  formatCHFCompact,
  formatNumber,
  formatPercent
} from '@/lib/format';

import {
  buildDrawdown,
  buildProjection,
  GOAL_VALUE,
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
        <ChartGrid>
          <ProjectionCard locale={locale} />
          <DrawdownCard locale={locale} />
        </ChartGrid>
      </section>
    </div>
  );
}
