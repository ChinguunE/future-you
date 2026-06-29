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
      <h1 className="text-5xl font-extrabold tracking-tight">{t('wordmark')}</h1>
      <p className="text-xl font-semibold text-[#2E8B6F]">{t('tagline')}</p>
      <p className="max-w-md text-base text-[#33514A]">{t('subtitle')}</p>
      <ApiStatus />
      <LocaleToggle current={locale} />
      <p className="mt-8 text-xs text-[#6B7E78]">{t('placeholderNote')}</p>
    </main>
  );
}
