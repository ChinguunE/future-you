'use client';

import * as React from 'react';
import {useTranslations} from 'next-intl';

import {ChartCard, type ChartCardLegendItem} from '@/components/charts/chart-card';
import {GrowthProjectionChart} from '@/components/charts/growth-projection-chart';
import {Sprout} from '@/components/illustration/Sprout';
import type {EquationSymbol} from '@/components/ui/equation-block';
import {chartTheme} from '@/lib/chart-theme';
import {formatCHF, formatCHFCompact} from '@/lib/format';

import {buildProjection, GOAL_VALUE, type Horizon} from './sample-data';

/**
 * The interactive island of /charts-demo (client): it owns the horizon state and
 * recasts the sample projection when it changes, then hands the data + every
 * resolved string to the presentational ChartCard + chart. i18n lives here (like
 * the teaching-primitives page), so the components stay prop-driven and reusable.
 */

// The future-value formula is language-neutral (symbols + numbers). The worked
// example matches the 15-year sample scenario; thin spaces (\,) keep the numbers
// reading the same in EN and FR (a comma would mean a decimal in French).
const FV_FORMULA = 'FV = P(1+r)^{n} + C \\cdot \\dfrac{(1+r)^{n} - 1}{r}';
const FV_EXAMPLE =
  '\\begin{aligned} FV &= 10\\,000\\left(1 + \\tfrac{0.05}{12}\\right)^{180} + 300 \\cdot \\dfrac{\\left(1 + \\tfrac{0.05}{12}\\right)^{180} - 1}{0.05 / 12} \\\\ &\\approx \\text{CHF } 100\\,000 \\end{aligned}';

export function ChartsDemo({locale}: {locale: string}) {
  const t = useTranslations('Charts');
  const [horizon, setHorizon] = React.useState<Horizon>('medium');

  const data = React.useMemo(() => buildProjection(horizon), [horizon]);

  const bold = (chunks: React.ReactNode) => (
    <b className="font-bold text-ink">{chunks}</b>
  );

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

  return (
    <ChartCard
      title={t('projection.title')}
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
        options: [
          {value: 'short', label: t('horizon.short')},
          {value: 'medium', label: t('horizon.medium')},
          {value: 'long', label: t('horizon.long')}
        ]
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
