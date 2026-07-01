'use client';

import {useEffect, useState} from 'react';

import {cn} from '@/lib/utils';

/**
 * ProgressBar — the guided-flow top progress bar (DESIGN §5 "thick rounded top
 * progress bar … animated fills"; §6 "progress on top"). A chunky rounded track
 * with a brand-green fill that carries the signature 3D hint: a hard 2px
 * green-800 inset bottom edge, the same depth language as the pressable button
 * and the journey coins — so the chrome feels of-a-piece, never a flat default.
 *
 * The fill "climbs": it mounts at `from` and animates to `value` on the next
 * frame (a real CSS width transition). Under prefers-reduced-motion the global
 * rule in globals.css collapses the transition, so the bar snaps to `value`
 * instantly — the state still changes, just without the travel (DESIGN §7).
 *
 * Accessibility (DESIGN §11): a real `role="progressbar"` with
 * aria-valuemin/max/now, plus `aria-valuetext` carrying the human "Step X of Y"
 * label that is ALSO shown on screen — progress is never conveyed by the bar
 * fill alone.
 */
export interface ProgressBarProps {
  /** Current step (1-based). Drives the fill width and aria-valuenow. */
  value: number;
  /** Total steps. */
  max: number;
  /** The visible + `aria-valuetext` value, e.g. "Step 3 of 4". */
  label: string;
  /** Accessible NAME for the bar (a progressbar needs one), e.g. "Your progress". */
  name: string;
  /** Where the fill starts before climbing to `value` (default = `value`, no climb). */
  from?: number;
  className?: string;
}

export function ProgressBar({value, max, label, name, from, className}: ProgressBarProps) {
  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  const target = clamp(value);
  const start = clamp(from ?? value);

  // Mount at `start`, then climb to `target` on the next frame so the CSS width
  // transition actually plays (a width set in the same paint as mount won't).
  const [shown, setShown] = useState(start);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const pct = max > 0 ? (shown / max) * 100 : 0;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={target}
        aria-valuetext={label}
        className="h-4 w-full overflow-hidden rounded-pill bg-ink/10"
      >
        <div
          className="h-full min-w-4 rounded-pill bg-green-600 shadow-[inset_0_-2px_0_var(--green-800)] transition-[width] duration-500 ease-out"
          style={{width: `${pct}%`}}
        />
      </div>
      {/* Visible step label — progress is never the bar fill alone (DESIGN §11). */}
      <p className="text-right font-display text-small font-bold text-text-muted">{label}</p>
    </div>
  );
}
