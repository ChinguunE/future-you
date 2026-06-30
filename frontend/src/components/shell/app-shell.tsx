import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';

import {SidebarNav} from './sidebar-nav';
import {StatusRail} from './status-rail';
import {TabBar} from './tab-bar';

/**
 * AppShell — the composable chrome for the research/dashboard surface (DESIGN
 * §13). Three columns on desktop (fixed SidebarNav · centre · sticky StatusRail);
 * on mobile a single column with the rail folded inline and a fixed bottom TabBar.
 *
 * Pages OPT IN by wrapping their content in it (Phase 5's `(app)/layout.tsx` will
 * just render `<AppShell>{children}</AppShell>`); the guided `(flow)` group renders
 * without it. The root `[locale]/layout.tsx` stays shell-free on purpose.
 *
 * - `activeHref` lets a page declare which nav item is current (useful before the
 *   real routes exist); otherwise the nav reads the live pathname.
 * - `rail={false}` hides the StatusRail for screens that don't want it.
 */
export function AppShell({
  children,
  activeHref,
  rail = true
}: {
  children: ReactNode;
  activeHref?: string;
  rail?: boolean;
}) {
  const t = useTranslations('Shell');

  return (
    <div className="min-h-dvh bg-paper">
      <a
        href="#main-content"
        className="sr-only rounded-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:font-display focus:font-bold focus:text-brand-deep focus:shadow-[var(--shadow-card)]"
      >
        {t('skipToContent')}
      </a>

      <SidebarNav
        activeHref={activeHref}
        className="fixed inset-y-0 left-0 hidden w-64 lg:flex"
      />

      <div className="lg:pl-64">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-4 pt-6 pb-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:px-8 lg:pt-8 lg:pb-12">
          <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
            {children}
          </main>
          {rail && <StatusRail className="lg:sticky lg:top-8 lg:self-start" />}
        </div>
      </div>

      <TabBar activeHref={activeHref} />
    </div>
  );
}
