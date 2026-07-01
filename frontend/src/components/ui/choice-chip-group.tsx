'use client';

import * as React from 'react';
import {RadioGroup} from 'radix-ui';

import {cn} from '@/lib/utils';

/**
 * ChoiceChipGroup — the SINGLE-select cousin of <ChoiceChip> (DESIGN §5), for
 * the risk quiz where exactly one answer is chosen. It wears the same chip skin
 * (white outlined pill → `--green-300` tint + `--green-600` border + a check
 * when selected) but rides on Radix RadioGroup so a real radiogroup ships:
 * roving tab-stop, arrow-key navigation between options, Space/Enter to choose.
 *
 * The toggle <ChoiceChip> (aria-pressed) stays as-is for future multi-select
 * ("what interests you"); this is its radio sibling, not a replacement.
 *
 * Accessibility (DESIGN §11): selection is conveyed three ways, never colour
 * alone — Radix's `aria-checked`, the green-600 border, and the inline check
 * that fades in. The 3px `--green-700` focus ring comes from the global
 * :focus-visible rule. `--ink` on the green-300 tint clears AA at 8.22:1. The
 * select bounce is gated behind `motion-safe:`, so reduced-motion users get an
 * instant change.
 */
export interface ChoiceOption {
  /** Stable value submitted on select. */
  value: string;
  /** The visible, accessible answer text. */
  label: string;
  /** Optional decorative library <Illustration>; omit for a text-only chip. */
  icon?: React.ReactNode;
}

export interface ChoiceChipGroupProps {
  options: ChoiceOption[];
  /** Controlled selected value (undefined = nothing chosen yet). */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Accessible group name — pass the id of the visible question heading. */
  'aria-labelledby'?: string;
  /** Fallback group label when there is no visible heading to point at. */
  'aria-label'?: string;
  className?: string;
}

export function ChoiceChipGroup({
  options,
  value,
  onValueChange,
  className,
  ...aria
}: ChoiceChipGroupProps) {
  return (
    <RadioGroup.Root
      // Always controlled (''=nothing chosen) so it never flips uncontrolled→controlled.
      value={value ?? ''}
      onValueChange={onValueChange}
      aria-labelledby={aria['aria-labelledby']}
      aria-label={aria['aria-label']}
      className={cn('flex flex-col gap-3', className)}
    >
      {options.map((opt) => (
        <RadioGroup.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            // Full-width answer rows: a big, calm tap target (DESIGN §6 "big",
            // §11 ≥48px), label left, check right.
            'group/chip flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-pill border-2 px-5 py-3 text-left font-bold select-none',
            'border-[var(--chip-border)] bg-white text-ink',
            // The signature 3D depth (DESIGN §4): a hard bottom lip that sinks on
            // press — the same tactile move as the button + the journey coins, so
            // the chips read chunky and pressable, never flat.
            'shadow-[0_3px_0_rgba(20,48,43,0.16)] transition-[transform,box-shadow,background-color,border-color] duration-150',
            'active:translate-y-[3px] active:shadow-[0_0_0_rgba(20,48,43,0.16)]',
            'data-[state=checked]:border-green-600 data-[state=checked]:bg-green-300 data-[state=checked]:shadow-[0_3px_0_var(--green-600)]',
            'data-[state=checked]:motion-safe:animate-[chip-pop_0.34s_ease-out]',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {opt.icon ? (
            <span className="inline-flex shrink-0 items-center">{opt.icon}</span>
          ) : null}
          <span className="flex-1">{opt.label}</span>
          {/* Selected cue — the same hand-drawn check, so it is never colour-alone. */}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0 text-brand-deep opacity-0 transition-opacity duration-150 group-data-[state=checked]/chip:opacity-100"
          >
            <path d="m3.5 8.5 3 3 6-7" />
          </svg>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
