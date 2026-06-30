import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {Card, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Illustration} from '@/components/illustration/Illustration';
import {Link} from '@/i18n/navigation';
import type {IllustrationId} from '@/lib/illustrations';
import {cn} from '@/lib/utils';

interface Stat {
  id: string;
  icon: IllustrationId;
  labelKey: string;
  valueKey: string;
  captionKey: string;
  href: string;
}

// The honest counters (DESIGN §13) — status, never pressure. Shown here in their
// pre-plan empty state: no invented figures (CLAUDE.md #3), just the true
// "nothing yet" each one starts at.
const STATS: Stat[] = [
  {
    id: 'plan-health',
    icon: 'stat/plan-health',
    labelKey: 'rail.planHealthLabel',
    valueKey: 'rail.planHealthValue',
    captionKey: 'rail.planHealthCaption',
    href: '/plan'
  },
  {
    id: 'invested',
    icon: 'stat/invested',
    labelKey: 'rail.investedLabel',
    valueKey: 'rail.investedValue',
    captionKey: 'rail.investedCaption',
    href: '/plan'
  },
  {
    id: 'next-review',
    icon: 'stat/next-review',
    labelKey: 'rail.nextReviewLabel',
    valueKey: 'rail.nextReviewValue',
    captionKey: 'rail.nextReviewCaption',
    href: '/summary'
  }
];

/**
 * StatusRail — the right-hand rail of stacked white stat cards plus the single
 * `--ink`→`--grape` highlight card a page may use (DESIGN §13). The "View all"
 * links use the AA-safe brand green (`--green-700`, 6.39:1) rather than `--sky`,
 * which fails text contrast (§11: accent fills are never text).
 *
 * Renders as the right column on desktop and folds inline below the main content
 * on mobile — placement is the grid's job (AppShell), not this component's.
 */
export function StatusRail({className}: {className?: string}) {
  const t = useTranslations('Shell');

  return (
    <aside aria-label={t('rail.title')} className={cn('flex flex-col gap-4', className)}>
      {STATS.map((stat) => (
        <Card key={stat.id} className="gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center">
                <Illustration id={stat.icon} size={28} decorative eager />
              </span>
              <span className="text-small font-bold tracking-wide text-text-muted uppercase">
                {t(stat.labelKey)}
              </span>
            </span>
            <Link
              href={stat.href}
              className="inline-flex min-h-8 shrink-0 items-center rounded-sm px-1 text-small font-bold tracking-wide text-brand-deep uppercase underline-offset-2 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          <p className="font-display text-h3 leading-tight text-ink">{t(stat.valueKey)}</p>
          <p className="text-small text-text-muted">{t(stat.captionKey)}</p>
        </Card>
      ))}

      <Card tone="highlight" className="gap-2">
        <CardHeader className="gap-1.5">
          {/* Solid white over the gradient (no opacity): a contrast tool can't read
              a gradient, and semi-transparent text composites over the page behind
              it and fails. Hierarchy comes from size/weight, not dimming. */}
          <p className="text-xs font-bold tracking-wide uppercase">
            {t('rail.highlightEyebrow')}
          </p>
          <CardTitle className="text-h2">{t('rail.highlightTitle')}</CardTitle>
          <p className="text-sm">{t('rail.highlightBody')}</p>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="secondary" className="rounded-pill border-0">
            <Link href="/plan">{t('rail.highlightCta')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </aside>
  );
}
