import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Baseline security headers on every response. (A strict CSP is added in Phase 6.)
const securityHeaders = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'}
];

const nextConfig: NextConfig = {
  // Hide the dev-mode overlay badge so it never sits over the UI in the
  // per-slice Playwright screenshot review (dev-only; no production effect).
  devIndicators: false,
  async headers() {
    return [{source: '/(.*)', headers: securityHeaders}];
  }
};

export default withNextIntl(nextConfig);
