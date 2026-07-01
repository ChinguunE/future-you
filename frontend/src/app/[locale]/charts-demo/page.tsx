import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Sprout} from '@/components/illustration/Sprout';

import {ChartsDemo} from './charts-demo';

/**
 * /charts-demo — a dev-only gallery proving the Slice-8 analytics foundation
 * (DESIGN §12): the shared chart-theme + the ChartCard wrapper, demonstrated by an
 * honest growth projection (a median line inside a p10-p90 band, a horizon toggle
 * that recasts the timeline, plain-language tooltips, a "you are here"/"your goal"
 * annotation, a "Show the maths" block reusing the Slice-7 EquationBlock, and a
 * "View as table" fallback). Like /style-guide and /teaching-primitives it 404s in
 * a production build, so it never ships. Sample data only.
 */
export default async function ChartsDemoPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  // Dev-only: keep it out of every production build / deploy.
  if (process.env.NODE_ENV === 'production') notFound();

  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Charts');

  return (
    <main className="min-h-dvh bg-canvas">
      {/* Wider than the guided flow's ~720px: the dashboard mode (DESIGN §6) uses a
          wider grid so the two upgraded charts can sit 2-up. The intro copy stays
          capped at a readable measure via max-w-prose below. */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-12 flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
          <Sprout pose="with-pie-chart" size="xl" priority />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-deep">
              {t('eyebrow')}
            </p>
            <h1 className="text-h1 text-ink">{t('title')}</h1>
            <p className="mt-2 max-w-prose text-body-lg text-text">
              {t('intro')}
            </p>
          </div>
        </header>

        <ChartsDemo locale={locale} />
      </div>
    </main>
  );
}
