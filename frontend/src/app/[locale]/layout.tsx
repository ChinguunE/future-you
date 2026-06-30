import type {Metadata} from 'next';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type {ReactNode} from 'react';

import {routing} from '@/i18n/routing';
import {baloo, nunito} from './fonts';
import {Providers} from './providers';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Future You',
  description: 'A personal investing research & education assistant.'
};

// Pre-render both locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${baloo.variable} ${nunito.variable}`}>
      {/* Paper/ink + fonts come from the design tokens in globals.css. */}
      <body className="antialiased">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
