'use client';

import * as React from 'react';
import {useTranslations} from 'next-intl';

import {
  ChartCard,
  ChartGrid,
  type ChartCardLegendItem
} from '@/components/charts/chart-card';
import {StatCard} from '@/components/charts/stat-card';
import {
  DrawdownChart,
  type DrawdownPoint
} from '@/components/charts/drawdown-chart';
import {GrowthProjectionChart} from '@/components/charts/growth-projection-chart';
import {Sprout} from '@/components/illustration/Sprout';
import type {EquationSymbol} from '@/components/ui/equation-block';
import {chartTheme} from '@/lib/chart-theme';
import {formatCHF, formatCHFCompact, formatPercent} from '@/lib/format';

import {
  buildDrawdown,
  buildProjection,
  GOAL_VALUE,
  type Horizon
} from './sample-data';

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

export function ChartsDemo({locale}: {locale: string}) {
  // The denser "premium dashboard" composition (DESIGN §6 research mode): a KPI stat
  // strip on top, then the two upgraded cards 2-up. Each card stays fully interactive
  // (its own horizon + view/table toggle + maths) — the calm guided flow never uses
  // this layout; it stays one-thing-per-screen.
  return (
    <div className="space-y-8">
      <PlanGlance locale={locale} />
      <ChartGrid>
        <ProjectionCard locale={locale} />
        <DrawdownCard locale={locale} />
      </ChartGrid>
    </div>
  );
}
