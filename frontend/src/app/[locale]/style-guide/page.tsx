import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';
import {SPROUT_MOMENTS, SPROUT_MOMENT_ORDER} from '@/components/illustration/moments';
import {ILLUSTRATIONS, ILLUSTRATION_CATEGORIES} from '@/lib/illustrations';

/**
 * /style-guide — a dev-only gallery of the Phase-4 design tokens (DESIGN §2–§4,
 * §11). It proves the token layer renders, passes axe-core WCAG-AA, and works in
 * EN + FR on mobile + desktop. It is NOT part of the shipped product: it 404s in
 * a production build, so it never reaches Vercel.
 */

type Role = 'text' | 'large' | 'decorative' | 'edge';

type Swatch = {
  name: string;
  bg: string; // a token bg-* utility
  hex: string;
  contrast: string;
  role: Role;
  outline?: boolean; // light surfaces need a hairline to be visible on paper
};

const GREENS: Swatch[] = [
  {name: 'green-300', bg: 'bg-green-300', hex: '#8FD3BE', contrast: '1.72:1', role: 'decorative'},
  {name: 'green-400', bg: 'bg-green-400', hex: '#54B49C', contrast: '2.50:1', role: 'decorative'},
  {name: 'green-500', bg: 'bg-green-500', hex: '#2E8B6F', contrast: '4.17:1', role: 'large'},
  {name: 'green-600', bg: 'bg-green-600', hex: '#247A5E', contrast: '5.22:1 (white)', role: 'text'},
  {name: 'green-700', bg: 'bg-green-700', hex: '#1F6B53', contrast: '6.39:1', role: 'text'},
  {name: 'green-800', bg: 'bg-green-800', hex: '#15543F', contrast: '—', role: 'edge'}
];

const INK: Swatch[] = [
  {name: 'ink', bg: 'bg-ink', hex: '#14302B', contrast: '14.12:1', role: 'text'},
  {name: 'text', bg: 'bg-text', hex: '#33514A', contrast: '8.69:1', role: 'text'},
  {name: 'text-muted', bg: 'bg-text-muted', hex: '#5E726B', contrast: '5.13:1', role: 'text'}
];

const SURFACES: Swatch[] = [
  {name: 'paper', bg: 'bg-paper', hex: '#FBF7EC', contrast: '—', role: 'decorative', outline: true},
  {name: 'white', bg: 'bg-white', hex: '#FFFFFF', contrast: '—', role: 'decorative', outline: true}
];

const ACCENTS: Swatch[] = [
  {name: 'coral', bg: 'bg-coral', hex: '#F07854', contrast: '2.79:1', role: 'decorative'},
  {name: 'gold', bg: 'bg-gold', hex: '#FCA848', contrast: '1.94:1', role: 'decorative'},
  {name: 'sky', bg: 'bg-sky', hex: '#6CB4F0', contrast: '2.23:1', role: 'decorative'},
  {name: 'grape', bg: 'bg-grape', hex: '#9C9CF0', contrast: '2.49:1', role: 'decorative'}
];

const TYPE_SCALE = [
  {cls: 'text-display font-display', label: 'Display · 48 / 800'},
  {cls: 'text-h1 font-display', label: 'Heading 1 · 32 / 800'},
  {cls: 'text-h2 font-display', label: 'Heading 2 · 24 / 700'},
  {cls: 'text-h3 font-display', label: 'Heading 3 · 20 / 700'},
  {cls: 'text-body-lg', label: 'Body large · 18 / 500'},
  {cls: 'text-body', label: 'Body · 16 / 500'},
  {cls: 'text-small', label: 'Small · 14 / 600'}
];

const RADII = [
  {cls: 'rounded-sm', label: 'sm · 8'},
  {cls: 'rounded-md', label: 'md · 12'},
  {cls: 'rounded-lg', label: 'lg · 16'},
  {cls: 'rounded-xl', label: 'xl · 24'},
  {cls: 'rounded-pill', label: 'pill · 999'}
];

function Swatches({
  items,
  roleLabel
}: {
  items: Swatch[];
  roleLabel: Record<Role, string>;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((s) => (
        <li key={s.name} className="space-y-2">
          <div
            className={`h-16 rounded-lg border ${s.bg} ${s.outline ? '' : 'border-transparent'}`}
          />
          <div className="space-y-0.5">
            <p className="text-small font-bold text-ink">{s.name}</p>
            <p className="font-mono text-xs text-text-muted">{s.hex}</p>
            <p className="nums text-xs text-text-muted">{s.contrast}</p>
            <span className="inline-block rounded-pill border px-2 py-0.5 text-xs font-semibold text-text">
              {roleLabel[s.role]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function StyleGuidePage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  // Dev-only: keep it out of every production build / deploy.
  if (process.env.NODE_ENV === 'production') notFound();

  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('StyleGuide');

  const roleLabel: Record<Role, string> = {
    text: t('roleText'),
    large: t('roleLarge'),
    decorative: t('roleDecorative'),
    edge: t('roleEdge')
  };

  // Locale-aware Swiss formatting (DESIGN: tabular numerals, format per locale).
  const money = new Intl.NumberFormat(`${locale}-CH`, {
    style: 'currency',
    currency: 'CHF'
  });
  const pct = new Intl.NumberFormat(`${locale}-CH`, {
    style: 'percent',
    signDisplay: 'always',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const rows = [
    {label: t('rowContributed'), value: money.format(12500), tone: 'plain' as const},
    {label: t('rowProjected'), value: money.format(48320.5), tone: 'plain' as const},
    {label: t('rowGoodYear'), value: `▲ ${pct.format(0.064)}`, tone: 'pos' as const},
    {label: t('rowRoughYear'), value: `▼ ${pct.format(-0.182)}`, tone: 'neg' as const}
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-h1 text-ink">{t('title')}</h1>
        <p className="mt-2 max-w-prose text-body-lg text-text">{t('intro')}</p>
      </header>

      {/* ---- Colour ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('colorTitle')}</h2>
        <p className="mb-5 max-w-prose text-text">{t('colorNote')}</p>
        <div className="space-y-6">
          <Swatches items={GREENS} roleLabel={roleLabel} />
          <Swatches items={INK} roleLabel={roleLabel} />
          <Swatches items={SURFACES} roleLabel={roleLabel} />
          <Swatches items={ACCENTS} roleLabel={roleLabel} />
        </div>
      </section>

      {/* ---- The two-green AA split (the centerpiece of this slice) ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('twoGreenTitle')}</h2>
        <p className="mb-5 max-w-prose text-text">{t('twoGreenNote')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex h-24 items-center justify-center rounded-lg bg-green-600 px-4 text-center text-body-lg font-bold text-white">
            {t('fillSample')} · 5.22:1
          </div>
          <div className="card-surface flex h-24 items-center justify-center text-center">
            <span className="text-body-lg font-bold text-brand-deep">
              {t('textSample')} · 6.39:1
            </span>
          </div>
        </div>
      </section>

      {/* ---- Type ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('typeTitle')}</h2>
        <p className="mb-5 max-w-prose text-text">{t('typeNote')}</p>
        <div className="space-y-3">
          {TYPE_SCALE.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className={`${row.cls} text-ink`}>{t('specimen')}</span>
              <span className="text-small text-text-muted">{row.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Shape + the pressable button ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('shapeTitle')}</h2>
        <p className="mb-5 max-w-prose text-text">{t('buttonNote')}</p>

        <div className="mb-8 flex flex-wrap items-end gap-4">
          {RADII.map((r) => (
            <div key={r.label} className="space-y-2 text-center">
              <div className={`size-16 border bg-green-300 ${r.cls}`} />
              <p className="text-xs text-text-muted">{r.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="btn-pressable">
            {t('buttonPrimary')}
          </button>
          <button type="button" className="btn-pressable btn-pressable--secondary">
            {t('buttonSecondary')}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="choice-chip" aria-pressed="false">
            {t('chipCautious')}
          </button>
          <button type="button" className="choice-chip" aria-pressed="true" data-selected="true">
            {t('chipBalanced')}
          </button>
          <button type="button" className="choice-chip" aria-pressed="false">
            {t('chipAdventurous')}
          </button>
        </div>
        <p className="mt-3 text-small text-text-muted">{t('chipNote')}</p>
      </section>

      {/* ---- Numbers (tabular, locale-formatted) ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('numbersTitle')}</h2>
        <p className="mb-5 max-w-prose text-text">{t('numbersNote')}</p>
        <dl className="card-surface max-w-sm divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2">
              <dt className="text-text">{row.label}</dt>
              <dd
                className={`nums font-bold tabular-nums ${
                  row.tone === 'pos'
                    ? 'text-pos'
                    : row.tone === 'neg'
                      ? 'text-neg'
                      : 'text-ink'
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---- Focus & motion ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('focusTitle')}</h2>
        <p className="max-w-prose text-text">{t('focusNote')}</p>
      </section>

      {/* ---- Sprout (the companion) — used BIG, one pose per moment ---- */}
      <section className="mb-12">
        <h2 className="text-h2 mb-1 text-ink">{t('sproutTitle')}</h2>
        <p className="mb-6 max-w-prose text-text">{t('sproutNote')}</p>

        {/* Hero: real presence + the gentle idle (still under reduced-motion). */}
        <div className="mb-8 flex flex-col items-center gap-4 rounded-xl bg-tint px-6 py-10">
          <Sprout pose="arms-out" size="2xl" priority />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-pill bg-white px-3 py-1 text-small font-semibold text-brand-deep">
              {t('sproutMotionOn')}
            </span>
            <span className="rounded-pill border border-border bg-white px-3 py-1 text-small font-semibold text-text-muted">
              {t('sproutMotionOff')}
            </span>
          </div>
        </div>

        {/* The §8 pose → moment set. */}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SPROUT_MOMENT_ORDER.map((moment) => (
            <li
              key={moment}
              className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 text-center shadow-[var(--shadow-card)]"
            >
              <span className="flex h-52 items-end justify-center">
                <Sprout pose={SPROUT_MOMENTS[moment]} size="lg" />
              </span>
              <p className="font-display text-h3 leading-tight text-ink">
                {t(`moments.${moment}`)}
              </p>
              <code className="font-mono text-xs text-text-muted">
                {SPROUT_MOMENTS[moment]}
              </code>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- The full illustration library (every piece has bilingual alt) ---- */}
      <section>
        <h2 className="text-h2 mb-1 text-ink">{t('galleryTitle')}</h2>
        <p className="mb-6 max-w-prose text-text">{t('galleryNote')}</p>
        <div className="space-y-8">
          {ILLUSTRATION_CATEGORIES.map((cat) => (
            <div key={cat}>
              <h3 className="text-h3 mb-3 text-ink">{t(`categories.${cat}`)}</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {ILLUSTRATIONS.filter((piece) => piece.category === cat).map((piece) => (
                  <li
                    key={piece.id}
                    className="flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-3 text-center"
                  >
                    <span className="flex h-28 items-center justify-center">
                      <Illustration id={piece.id} size={96} />
                    </span>
                    <code className="font-mono text-[11px] leading-tight text-text-muted">
                      {piece.id}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
