import type {SproutPose} from '@/lib/illustrations';

/**
 * The Sprout pose → moment map (DESIGN §8). Later screens think in *moments*
 * ("the plan", "research", "staying calm"); this names the canonical pose for
 * each so a flow never accidentally repeats the same one. `<Sprout>` still takes
 * a raw `pose`, so a caller can use either:
 *
 *   <Sprout pose="thinking" />
 *   <Sprout pose={SPROUT_MOMENTS.plan} />
 */
export type SproutMoment =
  | 'welcome'
  | 'thinking'
  | 'plan'
  | 'research'
  | 'growth'
  | 'learn'
  | 'retirement'
  | 'celebrate'
  | 'achieve'
  | 'reassure'
  | 'volatility';

export const SPROUT_MOMENTS: Record<SproutMoment, SproutPose> = {
  welcome: 'arms-out', //        a welcome / reveal
  thinking: 'thinking', //       the risk quiz, "let's think about this"
  plan: 'with-pie-chart', //     the allocation reveal
  research: 'with-magnifier', // research, "how risky is it"
  growth: 'growth-arrow', //     projections / returns over time
  learn: 'reading', //           glossary, learn hub
  retirement: 'relaxing-deckchair', // retirement / independence
  celebrate: 'celebrating', //   a finished plan, a milestone
  achieve: 'with-trophy', //     a goal achieved
  reassure: 'calm', //           staying calm in a dip
  volatility: 'riding-wave' //   market ups and downs
};

/** The moments in a sensible display order (used by the /style-guide wing). */
export const SPROUT_MOMENT_ORDER: readonly SproutMoment[] = [
  'welcome',
  'thinking',
  'plan',
  'research',
  'growth',
  'learn',
  'retirement',
  'reassure',
  'volatility',
  'celebrate',
  'achieve'
];
