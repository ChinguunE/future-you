'use client';

import {useSyncExternalStore} from 'react';
import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition
} from 'motion/react';

import {cn} from '@/lib/utils';
import type {IllustrationSize, SproutPose} from '@/lib/illustrations';
import {Illustration} from './Illustration';

export interface SproutProps {
  /** Which Sprout pose — one per moment (see SPROUT_MOMENTS). Default `arms-out`. */
  pose?: SproutPose;
  /** Longest-edge size: a token (`lg`, `xl`, `hero`…) or raw px. Default `xl` — big. */
  size?: IllustrationSize;
  /** Override the alt text (else the pose's bilingual description is used). */
  alt?: string;
  /** Treat as decorative (empty alt + aria-hidden) — e.g. a second Sprout for flourish. */
  decorative?: boolean;
  /** Prioritise loading (an above-the-fold hero Sprout). */
  priority?: boolean;
  /** Load immediately without preloading (chrome that may sit in a hidden container). */
  eager?: boolean;
  /** Idle animation on by default; pass `false` to force a still Sprout. */
  animated?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
}

// A gentle, organic idle: a slow vertical bob on one timeline and a slower
// "blink"/breath squash on another, so the two never lock into a mechanical
// loop. The squash pivots on Sprout's feet (transform-origin: bottom).
const IDLE_ANIMATE: TargetAndTransition = {
  y: [0, -10, 0],
  scaleY: [1, 1, 0.94, 1]
};
const IDLE_TRANSITION: Transition = {
  y: {duration: 3.2, repeat: Infinity, ease: 'easeInOut'},
  scaleY: {duration: 5.6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.82, 0.9, 1]}
};

// A no-op store subscription (idle "am I hydrated?" flag never changes after mount).
const subscribeNoop = () => () => {};

/**
 * <Sprout> — the companion mascot (DESIGN §8), used BIG with personality. Pick a
 * pose per moment (`<Sprout pose="thinking" />`); it idles with a soft bob/breath
 * unless the user prefers reduced motion, in which case it renders perfectly
 * still. Alt text comes from the pose's bilingual description by default.
 */
export function Sprout({
  pose = 'arms-out',
  size = 'xl',
  alt,
  decorative = false,
  priority = false,
  eager = false,
  animated = true,
  className
}: SproutProps) {
  const reduceMotion = useReducedMotion();
  // Gate the idle animation behind hydration so the server HTML and the first
  // client render are identical (a still <span>) regardless of the reduced-motion
  // media query — otherwise useReducedMotion resolving on the client causes a
  // hydration mismatch (surfaced by Next as a dev "Issue"). useSyncExternalStore
  // returns the server snapshot (false) through hydration, then true — idling
  // begins a tick later, with no mismatch.
  const isHydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const idle = animated && isHydrated && !reduceMotion;

  const art = (
    <Illustration
      id={`mascot/${pose}`}
      size={size}
      alt={alt}
      decorative={decorative}
      priority={priority}
      eager={eager}
    />
  );

  if (!idle) {
    return <span className={cn('inline-block', className)}>{art}</span>;
  }

  return (
    <motion.span
      className={cn('inline-block will-change-transform', className)}
      style={{transformOrigin: 'bottom center'}}
      animate={IDLE_ANIMATE}
      transition={IDLE_TRANSITION}
    >
      {art}
    </motion.span>
  );
}
