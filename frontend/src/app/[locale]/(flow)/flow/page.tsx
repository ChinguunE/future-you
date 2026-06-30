import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {SectionBanner} from '@/components/shell';
import {Button} from '@/components/ui/button';
import {JourneyPath, type JourneyNodeData, type JourneyNodeState} from '@/components/flow';
import {Link} from '@/i18n/navigation';

/**
 * /flow — a dev-only preview of the GUIDED-FLOW layout mode (DESIGN §6), the
 * second of the app's two layouts. Slice 6a ships the journey-path MAP screen:
 * the coral SectionBanner + the serpentine run of 3D coin nodes (profile → goal
 * → risk → plan) and a "Keep learning" unit that proves the same component
 * powers the Learn hub. Slice 6b wraps this in the interactive FlowChrome
 * (top progress bar + back + a risk-quiz step). Like /shell and /style-guide it
 * 404s in production, so it never ships.
 *
 * Representative/placeholder content only — no backend, no real questionnaire.
 */
export default async function FlowDemoPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Flow');

  const stateLabels: Record<JourneyNodeState, string> = {
    done: t('state.done'),
    current: t('state.current'),
    locked: t('state.locked')
  };

  // The guided journey, then a "Keep learning" unit (the Learn-hub reuse) — sample
  // labels only. Locked coins show the padlock regardless of their semantic icon.
  const nodes: JourneyNodeData[] = [
    {id: 'profile', icon: 'node/profile', state: 'done', label: t('nodes.profile')},
    {id: 'goal', icon: 'node/goal', state: 'done', label: t('nodes.goal')},
    {
      id: 'risk',
      icon: 'node/risk',
      state: 'current',
      label: t('nodes.risk'),
      callout: t('path.calloutStart')
    },
    {id: 'plan', icon: 'node/reward', state: 'locked', label: t('nodes.plan')},
    {
      id: 'learn-basics',
      icon: 'node/milestone',
      state: 'locked',
      label: t('nodes.learnBasics'),
      groupLabel: t('path.keepLearning')
    },
    {id: 'learn-diversify', icon: 'node/milestone', state: 'locked', label: t('nodes.learnDiversify')}
  ];

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12">
      <SectionBanner
        level={1}
        eyebrow={t('path.eyebrow')}
        title={t('path.title')}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="#profile">{t('path.guide')}</Link>
          </Button>
        }
      />

      <JourneyPath
        nodes={nodes}
        stateLabels={stateLabels}
        sprout={{pose: 'cheering', alt: t('path.sproutAlt')}}
      />
    </main>
  );
}
