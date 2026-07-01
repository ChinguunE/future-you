import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {SectionBanner} from '@/components/shell';
import {Button} from '@/components/ui/button';
import {
  FlowChrome,
  JourneyPath,
  type FlowStep,
  type JourneyNodeData,
  type JourneyNodeState
} from '@/components/flow';
import type {ChoiceOption} from '@/components/ui/choice-chip-group';
import {Link} from '@/i18n/navigation';

/**
 * /flow — a dev-only preview of the GUIDED-FLOW layout mode (DESIGN §6), the
 * second of the app's two layouts. Slice 6a shipped the journey-path MAP screen
 * (coral SectionBanner + serpentine 3D coin nodes). Slice 6b wraps it in the
 * interactive <FlowChrome>: tapping the current "Comfort with risk" coin slides
 * into a representative risk-quiz step (a top progress bar that climbs, a back
 * affordance, a big thinking Sprout, a single-select choice-chip question and
 * one bottom "Continue"). Like /shell and /style-guide it 404s in production.
 *
 * `?step=` drives the server render for deterministic screenshots:
 *   /flow            → the path map
 *   /flow?step=quiz  → the risk-quiz step
 *
 * Representative/placeholder content only — no backend, no real questionnaire.
 * The quiz is stage 3 of the 4-stage journey (About you · Goal · Risk · Plan),
 * so the progress bar reads "Step 3 of 4" and climbs from the 2/4 done mark.
 * "Continue" completes this single demo question and returns to the map.
 */
export default async function FlowDemoPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{step?: string}>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const {locale} = await params;
  const {step} = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Flow');

  const initialStep: FlowStep = step === 'quiz' ? 'quiz' : 'path';

  const stateLabels: Record<JourneyNodeState, string> = {
    done: t('state.done'),
    current: t('state.current'),
    locked: t('state.locked')
  };

  // The guided journey, then a "Keep learning" unit (the Learn-hub reuse) — sample
  // labels only. The current "risk" node (id="risk") is the quiz entry point.
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

  // The 6a path map — unchanged — handed to FlowChrome as the first step's body.
  const pathSlot = (
    <>
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
    </>
  );

  const answers: ChoiceOption[] = [
    {value: 'cautious', label: t('quiz.answers.cautious')},
    {value: 'balanced', label: t('quiz.answers.balanced')},
    {value: 'adventurous', label: t('quiz.answers.adventurous')}
  ];

  return (
    <FlowChrome
      initialStep={initialStep}
      pathSlot={pathSlot}
      advanceNodeId="risk"
      quiz={{question: t('quiz.question'), answers, sproutAlt: t('quiz.sproutAlt')}}
      progress={{value: 3, from: 2, max: 4}}
      labels={{
        step: t('quiz.step', {current: 3, total: 4}),
        progress: t('quiz.progressLabel'),
        back: t('quiz.back'),
        continue: t('quiz.continue')
      }}
    />
  );
}
