'use client';

import * as React from 'react';
import {useTranslations} from 'next-intl';

import {Illustration} from '@/components/illustration/Illustration';
import {ChoiceChip} from '@/components/ui/choice-chip';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {MoneyField} from '@/components/ui/money-field';
import {Segmented, SegmentedItem} from '@/components/ui/segmented';
import type {IllustrationId} from '@/lib/illustrations';

/**
 * The interactive corner of the /style-guide (client components). Everything else
 * on the page is static and server-rendered; only the bits that need real state —
 * selecting chips, typing a CHF amount, switching the horizon — live here so the
 * screenshots show genuine selected/typed states.
 */

export function ChipsDemo() {
  const t = useTranslations('StyleGuide');
  const [risk, setRisk] = React.useState('balanced');
  const [interests, setInterests] = React.useState<string[]>(['tech']);

  const toggleInterest = (id: string) =>
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Risk levels use Sprout poses that map to the feeling of each choice.
  const risks: {id: string; label: string; art: IllustrationId}[] = [
    {id: 'cautious', label: t('chipCautious'), art: 'mascot/calm'},
    {id: 'balanced', label: t('chipBalanced'), art: 'mascot/balancing-beam'},
    {id: 'adventurous', label: t('chipAdventurous'), art: 'mascot/catching-star'}
  ];
  // Interests use the sector library; `art: null` = no fitting illustration yet,
  // so that chip stays text-only (Phase 5 fills the gap with new Recraft art).
  const topics: {id: string; label: string; art: IllustrationId | null}[] = [
    {id: 'tech', label: t('components.interestTech'), art: 'sectors/technology'},
    {id: 'energy', label: t('components.interestEnergy'), art: 'sectors/clean-energy'},
    {id: 'health', label: t('components.interestHealth'), art: 'sectors/healthcare'},
    {id: 'property', label: t('components.interestProperty'), art: 'sectors/real-estate'},
    {id: 'industrials', label: t('components.interestIndustrials'), art: null}
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 font-bold text-ink">{t('components.chipsRiskLabel')}</p>
        {/* Single-select: choosing one chip clears the others. */}
        <div className="flex flex-wrap gap-3">
          {risks.map((r) => (
            <ChoiceChip
              key={r.id}
              selected={risk === r.id}
              icon={<Illustration id={r.art} size={56} decorative />}
              onClick={() => setRisk(r.id)}
            >
              {r.label}
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 font-bold text-ink">
          {t('components.chipsInterestsLabel')}
        </p>
        {/* Multi-select: each chip toggles independently. */}
        <div className="flex flex-wrap gap-3">
          {topics.map((tp) => (
            <ChoiceChip
              key={tp.id}
              selected={interests.includes(tp.id)}
              icon={
                tp.art ? (
                  <Illustration id={tp.art} size={40} decorative />
                ) : undefined
              }
              onClick={() => toggleInterest(tp.id)}
            >
              {tp.label}
            </ChoiceChip>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ControlsDemo() {
  const t = useTranslations('StyleGuide');
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('250');
  const [horizon, setHorizon] = React.useState('medium');

  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="sg-name">{t('components.nameLabel')}</Label>
        <Input
          id="sg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('components.namePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sg-money">{t('components.moneyLabel')} (CHF)</Label>
        <MoneyField
          id="sg-money"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t('components.moneyPlaceholder')}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <p id="sg-horizon-label" className="text-sm font-medium text-ink">
          {t('components.horizonLabel')}
        </p>
        <Segmented
          type="single"
          value={horizon}
          onValueChange={(v) => v && setHorizon(v)}
          aria-labelledby="sg-horizon-label"
        >
          <SegmentedItem value="short">{t('components.horizonShort')}</SegmentedItem>
          <SegmentedItem value="medium">
            {t('components.horizonMedium')}
          </SegmentedItem>
          <SegmentedItem value="long">{t('components.horizonLong')}</SegmentedItem>
        </Segmented>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sg-locked" className="opacity-60">
          {t('components.disabledLabel')}
        </Label>
        <Input id="sg-locked" disabled placeholder={t('components.namePlaceholder')} />
      </div>
    </div>
  );
}
