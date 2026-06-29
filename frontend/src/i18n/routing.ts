import {defineRouting} from 'next-intl/routing';

// The app ships in English and French (Geneva). `/en` and `/fr` are real URLs.
export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en'
});
