import {cn} from '@/lib/utils';
import {Illustration} from '@/components/illustration/Illustration';
import {Sprout} from '@/components/illustration/Sprout';
import {Link} from '@/i18n/navigation';
import type {IllustrationId, SproutPose} from '@/lib/illustrations';

/**
 * JourneyPath — Duolingo's signature "learn path" re-skinned to our world
 * (DESIGN §13 "journey path"; references: web-app-01 / ios-01). A vertical
 * serpentine run of chunky 3D "coin" nodes — the §4 pressable button mechanic
 * (solid fill + a hard, no-blur bottom lip that sinks on press) applied to a
 * CIRCLE. It maps the guided journey (profile → goal → risk → plan) and also
 * powers the Learn hub later, so it is purely data-driven.
 *
 * Re-skin, never a copy: our brand-green coins (not Duo's green), our coral
 * SectionBanner above it (the page composes that), our Sprout beside the current
 * node (never Duo's owl). Because the library `node/*` art is full-colour, each
 * coin carries a small WHITE medallion holding the illustration — the brief's
 * "green-600 fill + a centred node/* icon", made legible.
 *
 * States are never colour-alone (DESIGN §11): done = green coin + a check badge;
 * current = a bold ring + a gentle idle bob + a white speech-bubble callout;
 * locked = a flat grey coin + the `node/locked` padlock. Every node is a labelled
 * control that states its own status; locked nodes are inert + `aria-disabled`.
 *
 * Server-renderable: the press + bob are pure CSS, so the only client island is
 * the idling <Sprout>.
 */

export type JourneyNodeState = 'done' | 'current' | 'locked';

export interface JourneyNodeData {
  /** Stable key + default in-page anchor target. */
  id: string;
  /** The visible label under the coin (already translated). */
  label: string;
  /** Which `node/*` piece sits on the medallion. Locked coins always show the padlock. */
  icon: IllustrationId;
  state: JourneyNodeState;
  /** Where a done/current node leads. Defaults to an in-page anchor for the demo. */
  href?: string;
  /** The current node's speech-bubble text, e.g. "Start here". */
  callout?: string;
  /** When set, a labelled divider (a new "unit") is drawn above this node and the
   *  connective line breaks — used for the Learn hub's "Keep learning" section. */
  groupLabel?: string;
}

export interface JourneyPathProps {
  nodes: JourneyNodeData[];
  /** State words for the accessible labels, e.g. {done:'Completed', current:'Current step', locked:'Locked'}. */
  stateLabels: Record<JourneyNodeState, string>;
  /** The big mascot beside the current node (DESIGN §8 "use art big"). */
  sprout?: {pose?: SproutPose; alt?: string};
  className?: string;
}

// Layout constants — a normalised system so nodes (positioned in %) and the SVG
// line (a 0–100 × totalUnits viewBox stretched with non-scaling strokes) map to
// the SAME points at every width, with no per-segment trigonometry.
const AMP = 12; // serpentine swing, % of column width — a gentle weave like the
//                reference, wide enough that a node's label clears the next
//                node's callout on a narrow phone column, but never a staircase.
const TOP_PAD = 0.7; // empty units above the first node
const BOTTOM_PAD = 0.9; // empty units below the last node + its label
const GROUP_GAP = 0.85; // extra units inserted for a "Keep learning" divider

interface PlacedNode {
  node: JourneyNodeData;
  index: number;
  cx: number; // % of column width
  cy: number; // vertical units
  dividerY: number | null;
}

function layout(nodes: JourneyNodeData[]): {placed: PlacedNode[]; totalUnits: number} {
  let cursor = TOP_PAD;
  const placed = nodes.map((node, index) => {
    const startsGroup = Boolean(node.groupLabel) && index > 0;
    if (startsGroup) cursor += GROUP_GAP;
    const dividerY = startsGroup ? cursor - GROUP_GAP / 2 : null;
    const cy = cursor;
    cursor += 1;
    // A gentle weave, centred on the column: alternate sides with a touch of
    // per-node variation so it reads organic, never a mechanical zig-zag.
    const k = (index % 2 === 0 ? -1 : 1) * (0.9 + 0.1 * Math.cos(index));
    const cx = 50 + k * AMP;
    return {node, index, cx, cy, dividerY};
  });
  const last = placed[placed.length - 1];
  return {placed, totalUnits: (last ? last.cy : 0) + BOTTOM_PAD};
}

export function JourneyPath({nodes, stateLabels, sprout, className}: JourneyPathProps) {
  const {placed, totalUnits} = layout(nodes);

  // Connective line: a segment per adjacent same-group pair. A leg is "travelled"
  // (solid brand tint) when it leaves a done node; the road ahead is faint + dotted.
  const segments = placed.slice(0, -1).flatMap((from, i) => {
    const to = placed[i + 1];
    if (to.node.groupLabel) return []; // the path breaks at a new unit
    return [{from, to, done: from.node.state === 'done'}];
  });

  const current = placed.find((p) => p.node.state === 'current');
  // Stand the guide on the side opposite the current node so it faces the path.
  const sproutLeftPct = !current || current.cx >= 50 ? 18 : 82;

  return (
    <div
      className={cn('relative mx-auto w-full max-w-[680px] [--row-h:8.75rem] sm:[--row-h:9.25rem]', className)}
      style={{height: `calc(${totalUnits} * var(--row-h))`}}
    >
      {/* The connective thread, behind everything (decorative). */}
      <svg
        viewBox={`0 0 100 ${totalUnits}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {segments.map(({from, to, done}) => (
          <line
            key={`${from.node.id}-${to.node.id}`}
            x1={from.cx}
            y1={from.cy}
            x2={to.cx}
            y2={to.cy}
            stroke={done ? 'var(--path-done)' : 'var(--path-todo)'}
            strokeWidth={done ? 5 : 4}
            strokeLinecap="round"
            strokeDasharray={done ? undefined : '0.01 16'}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* The big guide, flanking the current node (one distinct pose per context). */}
      {current && sprout ? (
        <div
          className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2"
          style={{left: `${sproutLeftPct}%`, top: `calc(${current.cy} * var(--row-h))`}}
        >
          <span className="block origin-center scale-[0.58] sm:scale-90 lg:scale-100">
            <Sprout pose={sprout.pose ?? 'cheering'} alt={sprout.alt} size={208} decorative={!sprout.alt} eager />
          </span>
        </div>
      ) : null}

      {/* "Keep learning" unit dividers. */}
      {placed.map((p) =>
        p.dividerY != null ? (
          <div
            key={`divider-${p.node.id}`}
            className="absolute left-0 flex w-full -translate-y-1/2 items-center gap-3 px-2"
            style={{top: `calc(${p.dividerY} * var(--row-h))`}}
          >
            <span className="h-px flex-1 bg-[var(--path-todo)]" />
            <span className="font-display text-small font-bold tracking-wide text-text-muted uppercase">
              {p.node.groupLabel}
            </span>
            <span className="h-px flex-1 bg-[var(--path-todo)]" />
          </div>
        ) : null
      )}

      {/* The coins. */}
      {placed.map((p) => (
        <div
          key={p.node.id}
          id={p.node.id}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{left: `${p.cx}%`, top: `calc(${p.cy} * var(--row-h))`}}
        >
          <JourneyNode data={p.node} stateLabels={stateLabels} />
        </div>
      ))}
    </div>
  );
}

function JourneyNode({
  data,
  stateLabels
}: {
  data: JourneyNodeData;
  stateLabels: Record<JourneyNodeState, string>;
}) {
  const {state, label, callout} = data;
  const isLocked = state === 'locked';
  const isCurrent = state === 'current';
  const icon: IllustrationId = isLocked ? 'node/locked' : data.icon;
  const ariaLabel = `${label} — ${stateLabels[state]}`;

  // The chunky coin: a solid fill + a hard bottom lip + a soft cast shadow + an
  // inset top highlight. Done/current press (sink) on :active; locked is inert.
  const coin = (
    <span
      className={cn(
        'relative grid place-items-center rounded-full transition-[transform,box-shadow,filter] duration-[80ms] ease-out',
        !isLocked && 'hover:brightness-[1.04] active:translate-y-[6px]',
        state === 'done' &&
          'size-16 bg-[var(--node-done-bg)] shadow-[0_6px_0_var(--node-done-edge),var(--node-cast),var(--node-highlight)] active:shadow-[0_0_0_var(--node-done-edge),var(--node-highlight)] sm:size-[72px]',
        isCurrent &&
          'size-[76px] bg-[var(--node-current-bg)] shadow-[0_6px_0_var(--node-current-edge),0_0_0_4px_var(--white),0_0_0_9px_var(--node-current-ring),var(--node-cast),var(--node-highlight)] active:shadow-[0_0_0_var(--node-current-edge),0_0_0_4px_var(--white),0_0_0_9px_var(--node-current-ring),var(--node-highlight)] sm:size-[88px]',
        isLocked &&
          'size-16 bg-[var(--node-locked-bg)] shadow-[0_2px_0_var(--node-locked-edge),var(--node-highlight)] sm:size-[72px]'
      )}
    >
      {/* The white medallion makes the full-colour node art legible on the coin. */}
      <span
        className={cn(
          'grid place-items-center rounded-full',
          isCurrent ? 'size-[62%]' : 'size-[60%]',
          isLocked ? 'bg-white/70' : 'bg-white'
        )}
      >
        <Illustration id={icon} size={isCurrent ? 40 : 34} decorative />
      </span>

      {/* Done badge — a white disc + green check, so "done" is never colour-alone. */}
      {state === 'done' ? (
        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,48,43,0.22)]">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="var(--green-700)"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="m3.5 8.5 3 3 6-7" />
          </svg>
        </span>
      ) : null}
    </span>
  );

  // The coin is the anchor; the label and callout are absolutely placed off it so
  // the coin's centre stays exactly on the path point (the line connects to it).
  // Locked = a genuinely disabled button (inert + out of the tab order); its label
  // still announces the "Locked" state to assistive tech.
  const node = isLocked ? (
    <button type="button" disabled aria-label={ariaLabel} className="block cursor-not-allowed rounded-full">
      {coin}
    </button>
  ) : (
    <Link href={data.href ?? `#${data.id}`} aria-label={ariaLabel} className="block rounded-full">
      {coin}
    </Link>
  );

  return (
    <div className="relative grid place-items-center">
      {/* Current-node speech bubble with a downward, bordered tail. */}
      {isCurrent && callout ? (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap">
          <span className="relative block rounded-xl border-2 border-green-600 bg-white px-3.5 py-1.5 font-display text-small font-bold text-ink shadow-[0_4px_10px_rgba(20,48,43,0.14)]">
            {callout}
            <span
              aria-hidden="true"
              className="absolute top-full left-1/2 -mt-[7px] size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-r-2 border-b-2 border-green-600 bg-white"
            />
          </span>
        </span>
      ) : null}

      {/* The idle bob lives on a wrapper so it never fights the coin's press. */}
      {isCurrent ? (
        <span className="block motion-safe:animate-[journey-bob_2.4s_ease-in-out_infinite]">{node}</span>
      ) : (
        node
      )}

      <span
        className={cn(
          'absolute top-full mt-2 max-w-[8.5rem] text-center font-display text-small font-bold leading-tight',
          isLocked ? 'text-text-muted' : 'text-ink'
        )}
      >
        {label}
      </span>
    </div>
  );
}
