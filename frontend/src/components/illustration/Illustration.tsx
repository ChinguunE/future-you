import Image from 'next/image';
import {useTranslations} from 'next-intl';

import {cn} from '@/lib/utils';
import {
  ILLUSTRATION_BY_ID,
  illustrationBox,
  resolveSize,
  type IllustrationId,
  type IllustrationSize
} from '@/lib/illustrations';

export interface IllustrationProps {
  /** Which piece to render — a typed catalogue id, e.g. `concepts/etf`. */
  id: IllustrationId;
  /** Longest-edge size: a named token (`md`, `xl`, `hero`…) or raw px. Default `md`. */
  size?: IllustrationSize;
  /**
   * Override the alt text. Leave unset to use the bilingual description from the
   * `Illustrations.alt` messages (the normal path — every piece has EN + FR alt).
   */
  alt?: string;
  /**
   * Purely decorative repeat (the meaning is already in nearby text)? Hide it
   * from assistive tech with an empty alt + `aria-hidden`.
   */
  decorative?: boolean;
  /** Eagerly load + prioritise (above-the-fold hero art). */
  priority?: boolean;
  /** Extra classes on the sizing wrapper. */
  className?: string;
}

/**
 * <Illustration> — the one typed way to drop any of the 84 library pieces onto a
 * screen (DESIGN §8). It guarantees an accessible, translated alt text by default
 * (from next-intl, never hard-coded English), preserves each piece's true aspect
 * ratio, and never shifts layout. SVGs are served as-is (next/image auto-skips
 * optimisation for `.svg`); the goal PNGs are optimised.
 *
 * Works in both Server and Client Components — `useTranslations` is isomorphic.
 */
export function Illustration({
  id,
  size = 'md',
  alt,
  decorative = false,
  priority = false,
  className
}: IllustrationProps) {
  // Namespaced so the key is just `<category>.<name>` (the id with its slash → dot).
  const t = useTranslations('Illustrations.alt');
  const meta = ILLUSTRATION_BY_ID[id];
  const box = illustrationBox(meta, resolveSize(size));
  const resolvedAlt = decorative ? '' : (alt ?? t(id.replace('/', '.')));

  return (
    <span
      className={cn('inline-block', className)}
      style={{width: box.width, maxWidth: '100%'}}
    >
      <Image
        src={meta.src}
        alt={resolvedAlt}
        width={meta.width}
        height={meta.height}
        priority={priority}
        sizes={`${box.width}px`}
        draggable={false}
        aria-hidden={decorative || undefined}
        className="h-auto w-full select-none"
      />
    </span>
  );
}
