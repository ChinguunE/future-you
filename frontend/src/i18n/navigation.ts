import {createNavigation} from 'next-intl/navigation';

import {routing} from './routing';

// Locale-aware navigation helpers (Link/redirect/etc.) used across the app.
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
