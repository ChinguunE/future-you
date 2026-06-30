import {useTranslations} from 'next-intl';

import {cn} from '@/lib/utils';

/**
 * Wordmark — the "Future You" text lockup (no logo), top of the sidebar.
 *
 * The brand idea is "invest in *Future You*", so the second word carries the
 * emphasis: ink for "Future", brand green for "You". The string lives in the
 * message catalogue (identical in both locales) and is split on the space, so
 * the two-tone treatment never hard-codes the brand text.
 *
 * Presentational only — `useTranslations` is isomorphic, so this renders inside
 * the (client) SidebarNav as well as any server component.
 */
export function Wordmark({className}: {className?: string}) {
  const t = useTranslations('Landing');
  const [first, ...rest] = t('wordmark').split(' ');

  return (
    <span
      className={cn(
        'font-display text-h3 font-extrabold tracking-tight whitespace-nowrap',
        className
      )}
    >
      <span className="text-ink">{first}</span>
      {rest.length > 0 && (
        <>
          {' '}
          <span className="text-brand-deep">{rest.join(' ')}</span>
        </>
      )}
    </span>
  );
}
