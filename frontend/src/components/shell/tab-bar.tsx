'use client';

import {useTranslations} from 'next-intl';

import {Illustration} from '@/components/illustration/Illustration';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import {Link, usePathname} from '@/i18n/navigation';
import {cn} from '@/lib/utils';

import {MOBILE_MORE, MOBILE_PRIMARY, isNavActive} from './nav-items';
import {LocaleToggle} from './locale-toggle';

const TAB =
  'flex min-h-14 w-full flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-center';
const TAB_LABEL = 'text-[0.625rem] font-bold leading-none';

function IconBox({active, children}: {active: boolean; children: React.ReactNode}) {
  return (
    <span
      className={cn(
        'flex size-9 items-center justify-center rounded-md transition-colors',
        active && 'bg-tint'
      )}
    >
      {children}
    </span>
  );
}

/**
 * TabBar — the mobile bottom navigation (DESIGN §13). The 5 primary destinations
 * (the journey spine + the payoff) plus a "More" button; active = a rounded-square
 * `--green-300` highlight behind the icon + `--ink` label + `aria-current`. "More"
 * opens the Slice-4 bottom Sheet over the dimmed scrim, carrying the folded-away
 * destinations (Explore · Learn) and the language toggle.
 *
 * Hidden at `lg` and up, where the SidebarNav + StatusRail take over.
 */
export function TabBar({
  activeHref,
  className
}: {
  activeHref?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  const t = useTranslations('Shell');
  const moreActive = MOBILE_MORE.some((item) => isNavActive(current, item.href));

  return (
    <nav
      aria-label={t('tabbarLabel')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden',
        className
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {MOBILE_PRIMARY.map((item) => {
          const active = isNavActive(current, item.href);
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(TAB, active ? 'text-ink' : 'text-text-muted')}
              >
                <IconBox active={active}>
                  <Illustration id={item.icon} size={24} decorative eager />
                </IconBox>
                <span className={TAB_LABEL}>{t(`nav.${item.id}`)}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <Sheet>
            <SheetTrigger
              className={cn(TAB, moreActive ? 'text-ink' : 'text-text-muted')}
            >
              <IconBox active={moreActive}>
                <span aria-hidden className="flex items-center gap-[3px]">
                  <span className="size-1.5 rounded-full bg-current" />
                  <span className="size-1.5 rounded-full bg-current" />
                  <span className="size-1.5 rounded-full bg-current" />
                </span>
              </IconBox>
              <span className={TAB_LABEL}>{t('more.label')}</span>
            </SheetTrigger>

            <SheetContent side="bottom" closeLabel={t('close')} className="gap-5">
              <SheetHeader>
                <SheetTitle>{t('more.title')}</SheetTitle>
                <SheetDescription>{t('more.description')}</SheetDescription>
              </SheetHeader>

              <ul className="flex flex-col gap-1">
                {MOBILE_MORE.map((item) => {
                  const active = isNavActive(current, item.href);
                  return (
                    <li key={item.id}>
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 font-display font-bold transition-colors',
                            active ? 'bg-tint text-ink' : 'text-text hover:bg-tint/40'
                          )}
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center">
                            <Illustration id={item.icon} size={28} decorative eager />
                          </span>
                          <span>{t(`nav.${item.id}`)}</span>
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-small font-bold text-text">{t('language')}</span>
                <LocaleToggle />
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
