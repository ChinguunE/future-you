'use client';

import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';
import {Link, usePathname} from '@/i18n/navigation';
import {cn} from '@/lib/utils';

import {NAV_ITEMS, isNavActive} from './nav-items';
import {LocaleToggle} from './locale-toggle';
import {Wordmark} from './wordmark';

/**
 * SidebarNav — the fixed left navigation (desktop, DESIGN §13). Wordmark on top,
 * one row per destination (its flat nav illustration + an UPPERCASE label), and
 * a small utility card pinned at the bottom above the language toggle.
 *
 * Active state (never colour-alone): a soft `--green-300` tint pill + `--ink`
 * label + `aria-current="page"`. The label uses ink (8:1 on the tint) rather
 * than green-700 (only 3.7:1 on that tint, which would fail AA at this size).
 *
 * Positioning/visibility (fixed, hidden below `lg`) is passed in via `className`
 * by AppShell, so the component stays layout-agnostic.
 */
export function SidebarNav({
  activeHref,
  className
}: {
  activeHref?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  const t = useTranslations('Shell');

  return (
    <nav
      aria-label={t('sidebarLabel')}
      className={cn(
        'flex-col gap-1 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-5',
        className
      )}
    >
      <Link href="/home" className="mb-4 inline-flex rounded-md px-2 py-1">
        <Wordmark />
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(current, item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 font-display text-base font-bold tracking-wide uppercase transition-colors',
                  active ? 'bg-tint text-ink' : 'text-text hover:bg-tint/40'
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center">
                  <Illustration id={item.icon} size={28} decorative eager />
                </span>
                <span>{t(`nav.${item.id}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-3">
        <Card className="gap-3 p-4">
          <div className="flex items-center gap-3">
            <Sprout pose="reading" size={56} animated={false} eager />
            <div className="min-w-0">
              <p className="font-display text-small font-bold text-ink">
                {t('utility.title')}
              </p>
              <p className="text-xs text-text-muted">{t('utility.body')}</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href="/learn">{t('utility.cta')}</Link>
          </Button>
        </Card>
        <LocaleToggle className="self-start" />
      </div>
    </nav>
  );
}
