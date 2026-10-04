import { handSvg } from '@/lib/inkHand';

// Empty-page pictures (docs/DESIGN.md, "Empty states"). One family, built around the ballot box the owner liked: a white
// lid with the slot, an indigo box, a yellow label (yellow = you), thick ink outlines, a soft ground shadow and a few
// yellow sparkles. Each page tells its own little story with it, so no two empty pages look alike:
//   invite = Home on an empty site: a chat bubble holding a poll, and a slip going into the box (ask your friends)
//   list   = a list of polls: slips fanned over the box, the middle one an empty "+" (the first poll goes here)
//   topic  = a topic: the box in the topic's colour with the topic's icon on its front (TopicSpot adds the icon)
//   finger = My votes: the inked finger (the same drawing as the vote moment) beside the box and an empty slip
//   search = nothing found: slips and a magnifier;  lost = poll not found: a "?" slip;  done = nothing to review: a tick
// Inline SVG, no downloads; decorative, so hidden from screen readers. Subtle motion (election.css, "Spot motion"):
// sparkles twinkle, slips float, side slips sway, the finger nods, the magnifier circles, the "?" wobbles, the tick draws
// itself once. Nothing moves for people who ask their phone to reduce motion.
export type SpotKind = 'invite' | 'list' | 'topic' | 'finger' | 'search' | 'lost' | 'done';

const INK = 'var(--ink)';
const W = 2.5;

function Ground() {
  return <ellipse cx="100" cy="140" rx="80" ry="7" fill="var(--line)" />;
}
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  // Twinkles on its own beat (the delay comes from its position, so no two sparkles pulse together).
  return (
    <path
      className="spot-twinkle"
      style={{ animationDelay: `${((x * 7 + y * 3) % 23) / 10}s` }}
      d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`}
      fill="var(--lime)"
      stroke={INK}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );
}
/** The ballot box: body, lid with its slot, and the front label (or a badge for a topic's icon). */
function Box({ dx = 0, tone = 'var(--p-input)', front = 'label' }: { dx?: number; tone?: string; front?: 'label' | 'tick' | 'badge' }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      <rect x="50" y="74" width="100" height="58" rx="12" fill={tone} stroke={INK} strokeWidth={W} />
      <path d="M58 82h84" stroke="var(--spot-paper)" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      <rect x="42" y="62" width="116" height="18" rx="9" fill="var(--spot-paper)" stroke={INK} strokeWidth={W} />
      <rect x="80" y="67.5" width="40" height="6" rx="3" fill={INK} />
      {front === 'badge' ? (
        <circle cx="100" cy="104" r="17" fill="var(--spot-paper)" stroke={INK} strokeWidth={W} />
      ) : (
        <>
          <rect x="76" y="95" width="48" height="20" rx="10" fill="var(--lime)" stroke={INK} strokeWidth="2" />
          {front === 'tick' && <path className="spot-draw" d="M91 105l5 5 10-10" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      )}
    </g>
  );
}
/** A ballot slip, drawn around its own centre so it can tilt. */
function Slip({ cx, cy, rot = 0, dashed = false, mark = 'tick' }: { cx: number; cy: number; rot?: number; dashed?: boolean; mark?: 'tick' | 'plus' | 'row' | 'q' | 'none' }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <rect x="-15" y="-20" width="30" height="40" rx="5" fill={dashed ? 'var(--spot-paper)' : 'var(--spot-paper)'} stroke={INK} strokeWidth={W} strokeDasharray={dashed ? '5 4' : undefined} />
      {mark === 'tick' && (
        <>
          <circle cx="0" cy="-5" r="8" fill="var(--lime)" stroke={INK} strokeWidth="2" />
          <path d="M-3.5 -5l2.5 2.5 5-5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="-9" y="9" width="18" height="4" rx="2" fill={INK} opacity=".25" />
        </>
      )}
      {mark === 'plus' && (
        <>
          <circle cx="0" cy="0" r="9" fill="var(--lime)" stroke={INK} strokeWidth="2" />
          <path d="M0 -4.5v9M-4.5 0h9" stroke={INK} strokeWidth="2.25" strokeLinecap="round" />
        </>
      )}
      {mark === 'row' && (
        <>
          <circle cx="0" cy="-7" r="6" fill="var(--p-feedback)" stroke={INK} strokeWidth="2" />
          <rect x="-9" y="4" width="18" height="4" rx="2" fill={INK} opacity=".3" />
          <rect x="-9" y="11" width="12" height="4" rx="2" fill={INK} opacity=".2" />
        </>
      )}
      {mark === 'q' && <text x="0" y="7" textAnchor="middle" fontSize="20" fontWeight="800" fill={INK} fontFamily="var(--sans)">?</text>}
    </g>
  );
}

export default function Spot({ kind, tone, size = 176 }: { kind: SpotKind; tone?: string; size?: number }) {
  return (
    <svg className="spot" width={size} height={(size * 3) / 4} viewBox="0 0 200 150" aria-hidden focusable="false">
      <Ground />
      {kind === 'invite' && (
        <>
          {/* the box on the right; a chat bubble with a poll inside, its tail pointing at the box */}
          <Box dx={26} />
          <path d="M20 8h70a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14H64l-6 14-10-14H20A14 14 0 0 1 6 56V22A14 14 0 0 1 20 8z" fill="var(--spot-paper)" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <rect x="18" y="19" width="50" height="6" rx="3" fill={INK} opacity=".75" />
          <rect x="18" y="32" width="74" height="12" rx="6" fill="var(--p-input)" stroke={INK} strokeWidth="2" />
          <rect className="spot-fill" x="18" y="32" width="48" height="12" rx="6" fill="var(--lime)" stroke={INK} strokeWidth="2" />
          <rect x="18" y="50" width="74" height="12" rx="6" fill="var(--p-input)" stroke={INK} strokeWidth="2" />
          <rect className="spot-fill" style={{ animationDelay: '0.25s' }} x="18" y="50" width="26" height="12" rx="6" fill="var(--p-feedback)" stroke={INK} strokeWidth="2" />
          <g className="spot-bob"><Slip cx={136} cy={40} rot={-10} /></g>
          <Sparkle x={178} y={24} r={7} />
          <Sparkle x={24} y={104} r={6} />
          <Sparkle x={168} y={58} r={4} />
        </>
      )}
      {kind === 'list' && (
        <>
          {/* slips fanned over the box like cards; the middle one is the empty "+": the first poll goes here */}
          <Box />
          <g className="spot-sway"><Slip cx={72} cy={42} rot={-18} mark="row" /></g>
          <g className="spot-sway is-right"><Slip cx={128} cy={42} rot={18} mark="row" /></g>
          <g className="spot-bob"><Slip cx={100} cy={32} dashed mark="plus" /></g>
          <Sparkle x={34} y={40} r={7} />
          <Sparkle x={170} y={34} r={6} />
          <Sparkle x={160} y={110} r={4} />
        </>
      )}
      {kind === 'topic' && (
        <>
          {/* the box in the topic's colour; TopicSpot puts the topic's icon in the white badge */}
          <Box tone={tone} front="badge" />
          <g className="spot-bob"><Slip cx={100} cy={34} rot={-8} /></g>
          <Sparkle x={52} y={40} r={7} />
          <Sparkle x={152} y={30} r={6} />
          <Sparkle x={170} y={104} r={4} />
        </>
      )}
      {kind === 'finger' && (
        <>
          {/* the inked finger (the vote moment's own drawing) beside the box, and an empty slip waiting above the slot */}
          <Box dx={34} />
          <g className="spot-nod"><g transform="translate(6 44)" dangerouslySetInnerHTML={{ __html: handSvg('spot', 70) }} /></g>
          <g className="spot-bob"><Slip cx={134} cy={36} rot={8} dashed mark="none" /></g>
          <Sparkle x={70} y={40} r={6} />
          <Sparkle x={182} y={22} r={7} />
          <Sparkle x={193} y={112} r={4} />
        </>
      )}
      {kind === 'search' && (
        <>
          {/* slips with a magnifier: looking for a poll that is not there yet */}
          <Slip cx={78} cy={70} rot={-10} mark="row" />
          <Slip cx={110} cy={66} rot={6} mark="row" />
          <g className="spot-scan">
            <circle cx="132" cy="92" r="24" fill="var(--lime)" fillOpacity=".5" stroke={INK} strokeWidth="3.5" />
            <path d="M149 109l20 20" stroke={INK} strokeWidth="8" strokeLinecap="round" />
          </g>
          <Sparkle x={44} y={34} r={7} />
          <Sparkle x={170} y={44} r={5} />
        </>
      )}
      {kind === 'lost' && (
        <>
          <Box />
          <g className="spot-wobble"><Slip cx={110} cy={36} rot={22} mark="q" /></g>
          <Sparkle x={48} y={36} r={6} />
          <Sparkle x={160} y={28} r={5} />
        </>
      )}
      {kind === 'done' && (
        <>
          <Box front="tick" />
          <Sparkle x={48} y={40} r={7} />
          <Sparkle x={154} y={34} r={6} />
          <Sparkle x={168} y={96} r={4} />
        </>
      )}
    </svg>
  );
}
