'use client';

import * as React from 'react';
import {useTranslations} from 'next-intl';
import {ChevronRightIcon, InfoIcon} from 'lucide-react';

import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {Button} from '@/components/ui/button';
import {ChoiceChip} from '@/components/ui/choice-chip';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {MoneyField} from '@/components/ui/money-field';
import {Segmented, SegmentedItem} from '@/components/ui/segmented';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
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

/**
 * Overlays & disclosure (Slice 4). Dialog and Sheet are portalled overlays, so
 * their "closed" state is the trigger you see here; Playwright opens each to
 * capture the open state. Tabs and Accordion show both states inline (the first
 * accordion row opens by default). All keyboard-accessible and reduced-motion-safe.
 */
export function OverlaysDemo() {
  const t = useTranslations('StyleGuide.components');

  const sheetRows: {id: string; label: string; art: IllustrationId}[] = [
    {id: 'profile', label: t('ovSheetRowProfile'), art: 'node/profile'},
    {id: 'plan', label: t('ovSheetRowPlan'), art: 'nav/plan'},
    {id: 'learn', label: t('ovSheetRowLearn'), art: 'nav/learn'}
  ];

  const tabPanels = [
    {id: 'overview', label: t('ovTabOverview'), body: t('ovTabOverviewBody')},
    {id: 'holdings', label: t('ovTabHoldings'), body: t('ovTabHoldingsBody')},
    {id: 'about', label: t('ovTabAbout'), body: t('ovTabAboutBody')}
  ];

  const accordionItems = [
    {id: 'q1', q: t('ovAccQ1'), a: t('ovAccA1')},
    {id: 'q2', q: t('ovAccQ2'), a: t('ovAccA2')},
    {id: 'q3', q: t('ovAccQ3'), a: t('ovAccA3')}
  ];

  return (
    <div className="space-y-8">
      {/* Triggers for the portalled overlays: Dialog · Sheet · Tooltip */}
      <div className="flex flex-wrap items-center gap-3">
        {/* ---- Dialog (centred, over the ink scrim) ---- */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="primary">{t('ovDialogTrigger')}</Button>
          </DialogTrigger>
          <DialogContent closeLabel={t('ovClose')}>
            <DialogHeader>
              <div className="flex justify-center">
                <Sprout pose="with-pie-chart" size="lg" />
              </div>
              <DialogTitle className="text-center">
                {t('ovDialogTitle')}
              </DialogTitle>
              <DialogDescription className="text-center">
                {t('ovDialogBody')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">{t('ovDialogCancel')}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="primary">{t('ovDialogConfirm')}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Bottom sheet (mobile menu, slides up) ---- */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">{t('ovSheetTrigger')}</Button>
          </SheetTrigger>
          <SheetContent side="bottom" closeLabel={t('ovClose')}>
            <SheetHeader>
              <SheetTitle>{t('ovSheetTitle')}</SheetTitle>
              <SheetDescription>{t('ovSheetDesc')}</SheetDescription>
            </SheetHeader>
            <nav className="mx-auto w-full max-w-md">
              {sheetRows.map((row) => (
                <SheetClose asChild key={row.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Illustration id={row.art} size={28} decorative />
                    </span>
                    <span className="font-display text-body-lg font-bold text-ink">
                      {row.label}
                    </span>
                    <ChevronRightIcon
                      aria-hidden
                      className="ml-auto size-5 text-text-muted"
                    />
                  </button>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* ---- Tooltip (opens on hover OR focus) ---- */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('ovTooltipTrigger')}>
              <InfoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('ovTooltipTip')}</TooltipContent>
        </Tooltip>
      </div>

      {/* ---- Tabs: pill track + line variant ---- */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="font-bold text-ink">{t('ovTabsTitle')}</p>
          <Tabs defaultValue="overview">
            <TabsList>
              {tabPanels.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabPanels.map((p) => (
              <TabsContent key={p.id} value={p.id}>
                {p.body}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="space-y-3">
          <p className="font-bold text-ink">{t('ovTabsLineTitle')}</p>
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              {tabPanels.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabPanels.map((p) => (
              <TabsContent key={p.id} value={p.id}>
                {p.body}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* ---- Accordion: the "show the maths" disclosure ---- */}
      <div className="space-y-3">
        <p className="font-bold text-ink">{t('ovAccordionTitle')}</p>
        <Accordion type="single" collapsible defaultValue="q1">
          {accordionItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
