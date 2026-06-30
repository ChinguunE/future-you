import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {Card, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';
import {Link} from '@/i18n/navigation';
import type {IllustrationId, SproutPose} from '@/lib/illustrations';
import {cn} from '@/lib/utils';

interface Stat {
  id: string;
  icon: IllustrationId;
  labelKey: string;
  valueKey: string;
  captionKey: string;
  href: string;
  /** Card surface — one tinted stat tile gives the rail a colour block (DESIGN §13). */
  tone?: 'sky';
  /** The coloured halo behind the stat icon (a Duolingo achievement-badge tile). */
  chip: string;
}

// The honest counters (DESIGN §13) — status, never pressure. Shown here in their
// pre-plan empty state: no invented figures (CLAUDE.md #3), just the true
// "nothing yet" each one starts at. Each sits in a coloured icon-chip and the
// first is a sky-tinted tile, so the rail carries colour mass instead of reading
// like three empty white boxes (the reference rail is never empty — web-app-06).
const STATS: Stat[] = [
  {
    id: 'plan-health',
    icon: 'stat/plan-health',
    labelKey: 'rail.planHealthLabel',
    valueKey: 'rail.planHealthValue',
    captionKey: 'rail.planHealthCaption',
    href: '/plan',
    tone: 'sky',
    chip: 'bg-white ring-1 ring-foreground/8'
  },
  {
    id: 'invested',
    icon: 'stat/invested',
    labelKey: 'rail.investedLabel',
    valueKey: 'rail.investedValue',
    captionKey: 'rail.investedCaption',
    href: '/plan',
    chip: 'bg-green-300'
  },
  {
    id: 'next-review',
    icon: 'stat/next-review',
    labelKey: 'rail.nextReviewLabel',
    valueKey: 'rail.nextReviewValue',
    captionKey: 'rail.nextReviewCaption',
    href: '/summary',
    chip: 'bg-green-300'
  }
];

const HIGHLIGHT_SPROUT: SproutPose = 'climbing';

/**
 * StatusRail — the right-hand rail of stat tiles plus the single `--ink`→`--grape`
 * highlight card a page may use (DESIGN §13). Each tile = a coloured icon-chip +
 * the honest value, and the one sky-tinted tile + the dark gradient card carry the
 * rail's colour. The highlight card gets a Sprout peeking from the corner (the
 * reference's mascot-on-dark-card move).
 *
 * Labels/captions use `--text` (8.7:1) rather than `--text-muted`, so they clear
 * AA on the sky-tinted tile as comfortably as on white; hierarchy is carried by
 * size/weight (small label · big ink value), not by dimming the colour. The
 * "View all" links use the AA-safe brand green (`--green-700`, 6.39:1) — `--sky`
 * would fail text contrast (§11: accent fills are never text).
 *
 * Renders as the right column on desktop and folds inline below the main content
 * on mobile — placement is the grid's job (AppShell), not this component's.
 */
export function StatusRail({className}: {className?: string}) {
  const t = useTranslations('Shell');

  return (
    <aside aria-label={t('rail.title')} className={cn('flex flex-col gap-4', className)}>
      {STATS.map((stat) => (
        <Card key={stat.id} tone={stat.tone} className="gap-2.5">
          {/* Label + "View all" on the header row; the chip + value beneath it,
              each on its own full-width line — so nothing wraps mid-phrase in the
              narrow rail (reference: web-app-01 Daily Quests / Silver League cards). */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-bold tracking-wide text-text uppercase">
              {t(stat.labelKey)}
            </span>
            <Link
              href={stat.href}
              className="inline-flex min-h-8 shrink-0 items-center rounded-sm px-1 text-small font-bold tracking-wide text-brand-deep uppercase underline-offset-2 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl',
                stat.chip
              )}
            >
              <Illustration id={stat.icon} size={32} decorative eager />
            </span>
            <span className="font-display text-h3 leading-tight text-ink">
              {t(stat.valueKey)}
            </span>
          </div>
          <p className="text-small text-text">{t(stat.captionKey)}</p>
        </Card>
      ))}

      <Card tone="highlight" className="relative gap-2 overflow-hidden">
        {/* The mascot peeks from the corner (reference: the green character on the
            dark Super card). Decorative + still: the meaning is in the text, and a
            clipped idle bob would look restless. */}
        <Sprout
          pose={HIGHLIGHT_SPROUT}
          size={132}
          decorative
          animated={false}
          eager
          className="pointer-events-none absolute -right-4 -bottom-5 z-0 opacity-95"
        />
        <CardHeader className="relative z-10 gap-1.5 pr-20">
          {/* Solid white over the gradient (no opacity): a contrast tool can't read
              a gradient, and semi-transparent text composites over the page behind
              it and fails. Hierarchy comes from size/weight, not dimming. */}
          <p className="text-xs font-bold tracking-wide uppercase">
            {t('rail.highlightEyebrow')}
          </p>
          <CardTitle className="text-h2">{t('rail.highlightTitle')}</CardTitle>
          <p className="text-sm">{t('rail.highlightBody')}</p>
        </CardHeader>
        <CardFooter className="relative z-10">
          <Button asChild variant="secondary" className="rounded-pill border-0">
            <Link href="/plan">{t('rail.highlightCta')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </aside>
  );
}
