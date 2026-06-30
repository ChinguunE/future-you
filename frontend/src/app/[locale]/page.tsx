import {getTranslations, setRequestLocale} from 'next-intl/server';
import Image from 'next/image';

import {ApiStatus} from './api-status';
import {LocaleToggle} from './locale-toggle';

export default async function LandingPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Landing');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Image
        src="/illustrations/mascot/arms-out.svg"
        alt={t('mascotAlt')}
        width={180}
        height={180}
        priority
      />
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink">
        {t('wordmark')}
      </h1>
      <p className="text-xl font-bold text-brand-deep">{t('tagline')}</p>
      <p className="max-w-md text-base text-text">{t('subtitle')}</p>
      <ApiStatus />
      <LocaleToggle current={locale} />
      <p className="mt-8 text-xs text-text-muted">{t('placeholderNote')}</p>
    </main>
  );
}
