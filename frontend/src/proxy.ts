import createMiddleware from 'next-intl/middleware';

import {routing} from './i18n/routing';

// Next.js 16 renamed `middleware` → `proxy`. Handles EN/FR locale routing:
// `/` → `/en`, and every page lives under `/en` or `/fr`.
const proxy = createMiddleware(routing);

export default proxy;

export const config = {
  // Skip API, Next internals, and any file with an extension (static assets).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
