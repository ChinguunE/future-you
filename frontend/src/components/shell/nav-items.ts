import type {IllustrationId} from '@/lib/illustrations';

/**
 * The seven top-level destinations of the app shell (confirmed IA, Phase-4
 * Slice 5). The matching pages are built in Phase 5; the hrefs are the routes
 * they will live at, written locale-agnostically (the i18n `<Link>` adds the
 * `/en` · `/fr` prefix).
 */
export type NavId =
  | 'home'
  | 'plan'
  | 'explore'
  | 'analytics'
  | 'scenarios'
  | 'learn'
  | 'summary';

export interface NavItem {
  id: NavId;
  /** Locale-agnostic href. */
  href: string;
  /** The flat nav illustration shown beside the label (alt comes from the manifest). */
  icon: IllustrationId;
  /**
   * On phones the bottom tab bar shows the 5 primary destinations (the journey
   * spine + the payoff); the rest fold into the "More" sheet. Confirmed split:
   * primary = home · plan · analytics · scenarios · summary; More = explore · learn.
   */
  mobilePrimary: boolean;
}

// Sidebar order (desktop). The label for each id is `Shell.nav.<id>` in the
// message catalogues, so nothing here is hard-coded text.
export const NAV_ITEMS: NavItem[] = [
  {id: 'home', href: '/home', icon: 'nav/home', mobilePrimary: true},
  {id: 'plan', href: '/plan', icon: 'nav/plan', mobilePrimary: true},
  {id: 'explore', href: '/explore', icon: 'nav/explore', mobilePrimary: false},
  {id: 'analytics', href: '/analytics', icon: 'nav/analytics', mobilePrimary: true},
  {id: 'scenarios', href: '/scenarios', icon: 'nav/scenarios', mobilePrimary: true},
  {id: 'learn', href: '/learn', icon: 'nav/learn', mobilePrimary: false},
  {id: 'summary', href: '/summary', icon: 'nav/summary', mobilePrimary: true}
];

/** The bottom-bar primaries, in sidebar order (home · plan · analytics · scenarios · summary). */
export const MOBILE_PRIMARY = NAV_ITEMS.filter((item) => item.mobilePrimary);

/** The destinations that fold into the "More" sheet on mobile (explore · learn). */
export const MOBILE_MORE = NAV_ITEMS.filter((item) => !item.mobilePrimary);

/**
 * Is `href` the active destination for the current path? Matches the exact route
 * and any nested child (e.g. `/explore/asset/NVDA` keeps Explore active).
 */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
