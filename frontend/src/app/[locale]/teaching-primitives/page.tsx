import {type ReactNode} from 'react';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Sprout} from '@/components/illustration/Sprout';
import {
  EquationBlock,
  type EquationSymbol
} from '@/components/ui/equation-block';
import {GlossaryTerm} from '@/components/ui/glossary-term';

/**
 * /teaching-primitives — a dev-only gallery of the Slice-7 teaching layer
 * (DESIGN §5): the "show the maths" EquationBlock and the GlossaryTerm popover.
 * Like /style-guide it is NOT part of the shipped product — it 404s in a
 * production build, so it never reaches Vercel. Sample content only (a correct,
 * illustrative worked example; no live data).
 */

// The formula is language-neutral (symbols + numbers); every plain-language part
// comes from the message catalogue. Numbers use a thin-space thousands separator
// (\,) so they read the same in EN and FR — a comma would mean a decimal in FR.
const FV_FORMULA = 'FV = P(1+r)^{n} + C \\cdot \\dfrac{(1+r)^{n} - 1}{r}';
const FV_EXAMPLE =
  '\\begin{aligned} FV &= 1000\\left(1 + \\tfrac{0.05}{12}\\right)^{240} + 100 \\cdot \\dfrac{\\left(1 + \\tfrac{0.05}{12}\\right)^{240} - 1}{0.05 / 12} \\\\ &\\approx \\text{CHF } 43\\,800 \\end{aligned}';

export default async function TeachingPrimitivesPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  // Dev-only: keep it out of every production build / deploy.
  if (process.env.NODE_ENV === 'production') notFound();

  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('TeachingPrimitives');

  const bold = (chunks: ReactNode) => (
    <b className="font-bold text-ink">{chunks}</b>
  );

  const symbols: EquationSymbol[] = [
    {tex: 'FV', meaning: t('eqSymFV')},
    {tex: 'P', meaning: t('eqSymP')},
    {tex: 'C', meaning: t('eqSymC')},
    {tex: 'r', meaning: t('eqSymR')},
    {tex: 'n', meaning: t('eqSymN')}
  ];

  // "Learn more" points at the future glossary page (built in Phase 5). The
  // GlossaryTerm chunk carries only the word + heading; the shared props are the
  // same for every term, so they live here once.
  const glossaryHref = `/${locale}/glossary`;
  const glossaryProps = {
    learnMoreLabel: t('glossaryLearnMore'),
    learnMoreHref: glossaryHref,
    defineHint: t('glossaryDefineHint')
  };

  return (
    <main className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-12 flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
          <Sprout pose="reading" size="xl" priority />
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

        {/* ---- Section A · the "show the maths" EquationBlock ---- */}
        <section className="mb-14">
          <h2 className="text-h2 mb-1 text-ink">{t('equationTitle')}</h2>
          <p className="mb-5 max-w-prose text-text">{t('equationNote')}</p>
          <EquationBlock
            result={t.rich('eqResult', {b: bold})}
            showMathsLabel={t('showMaths')}
            formula={FV_FORMULA}
            formulaAlt={t('eqFormulaAlt')}
            symbolsLabel={t('eqSymbolsLabel')}
            symbols={symbols}
            exampleLabel={t('eqExampleLabel')}
            exampleFormula={FV_EXAMPLE}
            exampleAlt={t('eqExampleAlt')}
            exampleCaption={t.rich('eqExampleCaption', {b: bold})}
            whyLabel={t('eqWhyLabel')}
            why={t('eqWhy')}
            reward={
              <Sprout
                pose="growth-arrow"
                size={92}
                decorative
                animated={false}
                eager
              />
            }
          />
        </section>

        {/* ---- Section B · the GlossaryTerm popover ---- */}
        <section>
          <h2 className="text-h2 mb-1 text-ink">{t('glossaryTitle')}</h2>
          <p className="mb-5 max-w-prose text-text">{t('glossaryIntro')}</p>
          <div className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:p-6">
            <p className="max-w-prose text-body-lg leading-relaxed text-text">
              {t.rich('glossaryParagraph', {
                etf: (chunks) => (
                  <GlossaryTerm
                    term={t('wordEtf')}
                    definition={t('defEtf')}
                    {...glossaryProps}
                  >
                    {chunks}
                  </GlossaryTerm>
                ),
                diversification: (chunks) => (
                  <GlossaryTerm
                    term={t('wordDiversification')}
                    definition={t('defDiversification')}
                    {...glossaryProps}
                  >
                    {chunks}
                  </GlossaryTerm>
                ),
                volatility: (chunks) => (
                  <GlossaryTerm
                    term={t('wordVolatility')}
                    definition={t('defVolatility')}
                    {...glossaryProps}
                  >
                    {chunks}
                  </GlossaryTerm>
                )
              })}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
