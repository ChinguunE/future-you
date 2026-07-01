'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';

import {Button} from '@/components/ui/button';
import {ChoiceChipGroup, type ChoiceOption} from '@/components/ui/choice-chip-group';
import {ProgressBar} from '@/components/ui/progress-bar';
import {Sprout} from '@/components/illustration/Sprout';

/**
 * FlowChrome — the interactive shell of the guided flow (DESIGN §6 "guided
 * flow", §7 "smooth step transitions"). It composes inside the sidebar-free
 * (flow) layout and owns everything stateful the static path map can't: which
 * step is showing, the slide+fade between steps, the in-lesson chrome (a top
 * progress bar + a back affordance), the single bottom-anchored primary button,
 * and moving focus to the new step's heading on every change.
 *
 * Two demo steps, decided in Slice 6b:
 *  • `path` — the 6a journey map, kept pristine (NO chrome): the map IS the
 *    progress overview. Tapping the current "Comfort with risk" coin enters the
 *    lesson. (We intercept that coin's click; the rest of the map is untouched.)
 *  • `quiz` — a representative risk question wearing the full chrome: the
 *    progress bar climbs as the step enters, a back affordance returns to the
 *    map, one primary "Continue" sits at the bottom (disabled until answered).
 *
 * The `?step=` search param drives the SERVER render (so /flow?step=quiz paints
 * the quiz directly for deterministic screenshots); the client takes over and
 * animates subsequent moves. Transitions, the bar climb and Sprout's idle are
 * all gated for prefers-reduced-motion (instant state change, no travel).
 */
export type FlowStep = 'path' | 'quiz';

export interface FlowChromeProps {
  initialStep: FlowStep;
  /** The 6a path content (SectionBanner + JourneyPath), rendered server-side. */
  pathSlot: ReactNode;
  /** Container id of the current node whose tap enters the quiz (e.g. "risk"). */
  advanceNodeId: string;
  quiz: {
    /** The question, set big in Baloo. */
    question: string;
    /** 3–4 single-select answers. */
    answers: ChoiceOption[];
    /** Alt text for the thinking Sprout. */
    sproutAlt: string;
  };
  /** Where the quiz sits in the 4-stage journey (About you · Goal · Risk · Plan). */
  progress: {value: number; from: number; max: number};
  labels: {
    /** Visible + `aria-valuetext` step label, e.g. "Step 3 of 4". */
    step: string;
    /** Accessible name for the progress bar, e.g. "Your progress". */
    progress: string;
    /** Back affordance label. */
    back: string;
    /** Primary button label. */
    continue: string;
  };
}

const QUESTION_ID = 'flow-quiz-question';

export function FlowChrome({
  initialStep,
  pathSlot,
  advanceNodeId,
  quiz,
  progress,
  labels
}: FlowChromeProps) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [answer, setAnswer] = useState<string>();
  const [direction, setDirection] = useState(1);
  // The very first paint must not steal focus or slide; only real moves do.
  const [hasNavigated, setHasNavigated] = useState(false);

  function go(next: FlowStep, dir: number) {
    setHasNavigated(true);
    setDirection(dir);
    setStep(next);
    // Enter the quiz fresh each time (a clean, deterministic question).
    if (next === 'quiz') setAnswer(undefined);
    // Note: during the mode="wait" transition the activated control unmounts, so
    // keyboard/SR focus rests on <body> for ~240ms until the entering step's
    // heading takes it (StepPanel below). Acceptable for a step change here.
    if (typeof window !== 'undefined') {
      window.scrollTo({top: 0});
      const url = next === 'quiz' ? `${window.location.pathname}?step=quiz` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }
  }

  // Tapping the current node (its container carries id=advanceNodeId) enters the
  // quiz with the client transition instead of the node's in-page anchor jump.
  // Capture-phase + stopPropagation so the inner <Link> never also fires.
  function onPathClick(e: React.MouseEvent) {
    const hit = (e.target as HTMLElement).closest(`#${CSS.escape(advanceNodeId)}`);
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
      go('quiz', 1);
    }
  }

  const variants = {
    enter: (dir: number) => ({opacity: 0, x: reduce ? 0 : dir * 28}),
    center: {opacity: 1, x: 0},
    exit: (dir: number) => ({opacity: 0, x: reduce ? 0 : dir * -28})
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col px-4 sm:px-6">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{duration: reduce ? 0 : 0.24, ease: 'easeOut'}}
          className="flex flex-1 flex-col"
        >
          {step === 'path' ? (
            <StepPanel focusHeading={hasNavigated}>
              <div
                onClickCapture={onPathClick}
                className="flex flex-col gap-8 py-8 sm:gap-10 sm:py-12"
              >
                {pathSlot}
              </div>
            </StepPanel>
          ) : (
            <StepPanel focusHeading={hasNavigated}>
              <div className="flex flex-1 flex-col py-5 sm:py-7">
                {/* Top chrome: back + the climbing progress bar. */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={labels.back}
                    onClick={() => go('path', -1)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-6">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </Button>
                  <ProgressBar
                    className="flex-1"
                    value={progress.value}
                    from={progress.from}
                    max={progress.max}
                    label={labels.step}
                    name={labels.progress}
                  />
                </div>

                {/* One thing per screen: big Sprout, big question, the answers. */}
                <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 sm:gap-8">
                  {/* Mascot used BIG (DESIGN §8) — scaled up on wider viewports so it
                      never floats small in the empty canvas (same scale-wrapper
                      pattern the 6a journey path uses for its Sprout). */}
                  <span className="block origin-center scale-[0.83] sm:scale-100 lg:scale-[1.12]">
                    <Sprout pose="thinking" alt={quiz.sproutAlt} size={208} priority />
                  </span>
                  <h1
                    id={QUESTION_ID}
                    data-step-heading
                    tabIndex={-1}
                    className="max-w-[28ch] text-center font-display text-3xl leading-tight font-bold text-balance text-ink outline-none sm:text-4xl"
                  >
                    {quiz.question}
                  </h1>
                  <ChoiceChipGroup
                    className="w-full max-w-md"
                    options={quiz.answers}
                    value={answer}
                    onValueChange={setAnswer}
                    aria-labelledby={QUESTION_ID}
                  />
                </div>

                {/* Exactly one primary button, bottom-anchored (DESIGN §4/§6). */}
                <div className="mt-auto flex justify-center pt-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full max-w-md"
                    disabled={answer === undefined}
                    onClick={() => go('path', 1)}
                  >
                    {labels.continue}
                  </Button>
                </div>
              </div>
            </StepPanel>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

/**
 * Wraps a step's content and, on a real step change (not first paint), moves
 * keyboard/SR focus to the step's heading — so the flow announces where you are
 * without yanking focus on initial load. Programmatic focus doesn't trigger
 * :focus-visible, so no ring lingers on the heading.
 */
function StepPanel({focusHeading, children}: {focusHeading: boolean; children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusHeading) return;
    const heading = ref.current?.querySelector<HTMLElement>('h1, h2, [data-step-heading]');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({preventScroll: true});
    }
  }, [focusHeading]);
  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
