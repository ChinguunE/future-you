import type {ReactNode} from 'react';

import {cn} from '@/lib/utils';

/**
 * SectionBanner — a solid-colour section header with a hard 3D bottom edge, the
 * Duolingo unit-banner pattern re-skinned to our palette (DESIGN §13 "Section
 * banner"; reference: web-app-01 / ios-01 orange "Dining" banner + GUIDEBOOK pill).
 *
 * Colour: `--coral` fill + a hard `--coral-shadow` bottom lip (no blur — the same
 * tactile move as the pressable button, scaled up to a banner). The title is
 * `--ink`, NOT white: white fails AA on coral (2.79:1), while ink clears it at
 * 5.06:1 (the figure verified in button.tsx). So this banner reads bold and warm
 * and still passes WCAG-AA. The eyebrow is also ink (small/bold needs 4.5:1; ink
 * gives 5.06:1) — hierarchy comes from size/weight, never from dimming the text.
 *
 * `action` is the slot for a secondary white-pill 3D CTA (DESIGN §13 b); `art`
 * is an optional illustration pinned to the right. Server-renderable.
 */
export function SectionBanner({
  eyebrow,
  title,
  level = 2,
  action,
  art,
  className
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Heading level for the title — use 1 when the banner is the page's main heading. */
  level?: 1 | 2;
  action?: ReactNode;
  art?: ReactNode;
  className?: string;
}) {
  const Heading = `h${level}` as 'h1' | 'h2';

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-lg bg-coral text-ink',
        'shadow-[0_6px_0_var(--coral-shadow)]',
        'flex flex-col items-start gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6',
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <p className="text-small font-bold tracking-wide text-ink uppercase">{eyebrow}</p>
        ) : null}
        <Heading className="font-display text-h2 leading-tight text-ink">{title}</Heading>
      </div>
      {action || art ? (
        <div className="flex shrink-0 items-center gap-4">
          {art}
          {action}
        </div>
      ) : null}
    </section>
  );
}
