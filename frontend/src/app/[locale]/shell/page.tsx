import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {AppShell} from '@/components/shell';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';

/**
 * /shell — a dev-only preview of the app shell (DESIGN §13). It wraps placeholder
 * centre content in <AppShell> so both layout modes (desktop 3-column · mobile
 * tab bar + folded rail + "More" sheet) are screenshot-able before the real
 * Phase-5 pages exist. Like /style-guide, it 404s in a production build, so it
 * never ships to Vercel.
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

  const cards = [
    {icon: 'nav/plan' as const, title: 'demo.cardPlanTitle', body: 'demo.cardPlanBody'},
    {icon: 'nav/learn' as const, title: 'demo.cardLearnTitle', body: 'demo.cardLearnBody'}
  ];

  return (
    <AppShell activeHref="/home">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-small font-bold tracking-wide text-brand-deep uppercase">
              {t('demo.eyebrow')}
            </p>
            <h1 className="font-display text-h1 text-ink">{t('demo.title')}</h1>
            <p className="max-w-prose text-body-lg text-text">{t('demo.lead')}</p>
          </div>
          <Sprout pose="with-pie-chart" size={140} priority className="shrink-0" />
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center">
                    <Illustration id={card.icon} size={32} decorative />
                  </span>
                  <CardTitle>{t(card.title)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-text">{t(card.body)}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
