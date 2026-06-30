import {setRequestLocale} from 'next-intl/server';
import type {ReactNode} from 'react';

/**
 * (flow) route-group layout — the guided-flow surface (DESIGN §6 "guided flow").
 *
 * It renders WITHOUT the AppShell sidebar/rail on purpose: AppShell was kept
 * opt-in in Slice 5 so the Duolingo-strict flow (one clear thing per screen, big
 * art, big type, progress on top, lots of breathing room) never fights the
 * dashboard chrome. White surface only (DESIGN §2 / §14.3 — confirmed Slice 5.5).
 *
 * This layout owns just the sidebar-free white canvas; the interactive chrome
 * (the top progress bar, the back affordance, the slide+fade step transitions)
 * is the FlowChrome client island the flow pages compose inside it.
 */
export default async function FlowLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return <div className="min-h-dvh bg-white">{children}</div>;
}
