import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {AppShell, SectionBanner} from '@/components/shell';
import {Button} from '@/components/ui/button';
import {Card, CardTitle} from '@/components/ui/card';
import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';
import {Link} from '@/i18n/navigation';
import type {IllustrationId} from '@/lib/illustrations';

/**
 * /shell — a dev-only preview of the app shell (DESIGN §13). It wraps representative
 * centre content in <AppShell> so both layout modes (desktop 3-column · mobile tab
 * bar + folded rail + "More" sheet) are screenshot-able before the real Phase-5
 * pages exist. Like /style-guide, it 404s in a production build, so it never ships.
 *
 * The content is deliberately dense and colour-blocked (a coral section banner,
 * a big welcome Sprout, list cards carrying illustrations, a 3-step stepper) so the
 * shell is exercised at the reference's richness — never a flat empty field.
 */
export default async function ShellDemoPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Shell');

  const cards: {
    icon: IllustrationId;
    art: IllustrationId;
    title: string;
    body: string;
    tone?: 'sky';
  }[] = [
    {
      icon: 'nav/plan',
      art: 'mascot/with-pie-chart',
      title: 'demo.cardPlanTitle',
      body: 'demo.cardPlanBody',
      tone: 'sky'
    },
    {
      icon: 'nav/learn',
      art: 'mascot/reading',
      title: 'demo.cardLearnTitle',
      body: 'demo.cardLearnBody'
    }
  ];

  const steps: {icon: IllustrationId; title: string; body: string}[] = [
    {icon: 'node/profile', title: 'demo.howProfileTitle', body: 'demo.howProfileBody'},
    {icon: 'node/goal', title: 'demo.howGoalTitle', body: 'demo.howGoalBody'},
    {icon: 'node/risk', title: 'demo.howRiskTitle', body: 'demo.howRiskBody'}
  ];

  return (
    <AppShell activeHref="/home">
      <div className="flex flex-col gap-8">
        {/* Section banner — the coloured page header (reference: web-app-01 unit
            banner + GUIDEBOOK pill). Its title is the page's h1. */}
        <SectionBanner
          level={1}
          eyebrow={t('demo.eyebrow')}
          title={t('demo.title')}
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/learn">{t('demo.bannerCta')}</Link>
            </Button>
          }
        />

        {/* Hero — the big welcome Sprout (DESIGN §8 "use art big") + the single
            primary 3D CTA on the screen. */}
        <Card>
          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div className="flex flex-col items-start gap-4">
              <p className="max-w-prose text-body-lg text-text">{t('demo.lead')}</p>
              <Button asChild size="lg">
                <Link href="/plan">{t('rail.highlightCta')}</Link>
              </Button>
            </div>
            <Sprout
              pose="arms-out"
              size={208}
              priority
              className="justify-self-center sm:justify-self-end"
            />
          </div>
        </Card>

        {/* List cards with illustration (reference: web-app-02 Practice rows). */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 text-ink">{t('demo.sectionTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <Card key={card.title} tone={card.tone}>
                <div className="flex items-center gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center">
                        <Illustration id={card.icon} size={30} decorative eager />
                      </span>
                      <CardTitle>{t(card.title)}</CardTitle>
                    </div>
                    <p className="text-text">{t(card.body)}</p>
                  </div>
                  <Illustration
                    id={card.art}
                    size={80}
                    decorative
                    eager
                    className="shrink-0 self-end"
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* The journey in three steps — a real sequence, so the numbering encodes
            order (it isn't decoration). Fills the column with colour, not emptiness. */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 text-ink">{t('demo.howTitle')}</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full items-center justify-center gap-2 text-center">
                  <span className="relative inline-flex">
                    <Illustration id={step.icon} size={60} decorative eager />
                    <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-green-600 font-display text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <p className="font-display text-body-lg font-bold text-ink">{t(step.title)}</p>
                  <p className="text-small text-text">{t(step.body)}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
