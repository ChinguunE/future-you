'use client';

import {useLocale, useTranslations} from 'next-intl';

import {Link, usePathname} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';
import {cn} from '@/lib/utils';

/**
 * LocaleToggle — the EN/FR switch that lands with the shell (replacing the
 * day-one stub). It is **path-preserving**: `usePathname()` is locale-agnostic,
 * so switching language keeps you on the same screen. The current language gets
 * `aria-current` (state isn't carried by colour alone), and it's a labelled
 * group rather than a second `<nav>` landmark so the page keeps clean landmarks.
 */
export function LocaleToggle({className}: {className?: string}) {
  const active = useLocale();
  const pathname = usePathname();
  const t = useTranslations('Shell');

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill bg-muted p-1',
        className
      )}
    >
      {routing.locales.map((loc) => {
        const isActive = loc === active;
        return (
          <Link
            key={loc}
            href={pathname}
            locale={loc}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'flex min-h-11 min-w-12 items-center justify-center rounded-pill px-3 text-small font-bold uppercase transition-colors',
              isActive
                ? 'bg-white text-brand-deep shadow-[var(--shadow-card)]'
                : 'text-text hover:text-brand-deep'
            )}
          >
            {loc}
          </Link>
        );
      })}
    </div>
  );
}
