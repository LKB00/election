import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { nanoid, customAlphabet } from 'nanoid';
import { shareProof } from './secret';
import { RATING_EMOJIS, RATING_LABELS, ratingAverage, usesPicks, type PollKind } from './rating';
import { cleanText, isCode } from './validation';
import { schema, type Db } from '@/db';
import type { CreatePollInput } from './validation';
import { hasBlockedWord, namesPolitics } from './moderation';
import { GROUP_DEFAULT_DAYS, MAX_OTHER, OTHER_MIN_PEOPLE, OTHER_TOP } from './limits';
import { sealedUntil } from './silence';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isAdminKey } from './admin';
import { INDIA_OFFSET, INDIA_TZ } from './time';

const { polls, options, votes, reactions, reports, photos, votePicks } = schema;

export const REACTIONS = ['🔥', '😂', '😮', '👏', '🤔'] as const;
const pollId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);
const shareCodeId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 10);

export type PollOption = {
  id: string;
  label: string;
  imageUrl: string | null;
  subtitle: string | null;
  imageCredit: string | null;
  /** The creator's emoji for this choice, if any. */
  emoji: string | null;
  /** The "Other (write your own)" choice: shown in the voter's language, tapping it asks for a name. */
  isOther: boolean;
  votes: number;
  percent: number;
  /** Rank polls: the average place voters gave it (1 = first), when results are visible. */
  avgPlace: number | null;
  /** "Which dates work?": how many said "if need be" (votes = how many said yes). */
  maybe: number;
  /** Why this option's voters picked it (only when results are visible). */
  reasons: { reason: string; n: number }[];
};
export type PollView = {
  id: string;
  title: string;
  description: string;
  category: string;
  hideUntilVoted: boolean;
  allowChange: boolean;
  endsAt: string | null;
  closed: boolean;
  totalVotes: number;
  /** How many people voted. Safe to show before voting: it does not reveal the split. */
  participants: number;
  /** The option this voter picked, if any. */
  myVote: string | null;
  /** False when the organiser hides numbers and this voter may not see them yet. */
  resultsVisible: boolean;
  featured: boolean;
  /** Checked by the owner (only reviewed duels are offered to search engines). */
  reviewed: boolean;
  /** Waiting for the owner's check before it shows in public lists (politics and photo polls); its link works. */
  heldForReview: boolean;
  /** Voting paused after a sudden flood of votes, until this time (results stay visible). */
  pausedUntil: string | null;
  /** Election silence window: results of this politics duel stay sealed for everyone until this time. */
  sealedUntil: string | null;
  /** Choices for the one-tap "why?" question. Empty means the poll does not ask. */
  reasons: string[];
  myReason: string | null;
  /** Real activity, safe to show before voting. */
  pulse: { lastHour: number; lastVoteAt: string | null };
  /** "You're voter #15". Null until this person votes. */
  myVoterNumber: number | null;
  /** First option's share over time (0-100), only when results are visible and there are two options. */
  trend: { t: string; a: number }[];
  /** Counting day: running totals per option after each of 3 counting rounds (votes in the order they were cast). Only when results are visible. */
  rounds: Record<string, number>[];
  /** Swing: how the current leader's share moved in the last 24 hours (percentage points). Null when there is too little history. */
  swing: { optionId: string; points: number } | null;
  reactions: { emoji: string; n: number }[];
  myReactions: string[];
  /** You voted, but have not answered "who's winning right now?" yet. Results stay hidden until you do. */
  needsGuess: boolean;
  /** Your guess and whether it was right (null = skipped or not asked). */
  myGuess: { optionId: string; correct: boolean } | null;
  /** Code for your share link, and how the friends who used it voted. */
  myShareCode: string | null;
  /** 'choice' (pick one), 'rating' (1–5 faces; the options are the five steps) or 'multi' (pick several). */
  kind: PollKind;
  /** Every choice this voter ticked (one for pick-one polls; several for "pick several"). */
  myPicks: string[];
  /** The full booth ritual (EVM, VVPAT slip, voter ID, counting day). Always on for politics polls; a choice for the creator otherwise. */
  electionMode: boolean;
  /** Lets an open (not secret) share link show your pick on its preview image. */
  myShareProof: string | null;
  friends: { agree: number; disagree: number };
  /** My group vs everyone (pick-one polls, results visible, at least GROUP_MIN friends from your link): the share of your
   *  group (you + those friends) and of everyone who picked what you picked, in whole percent. */
  group: { size: number; mine: number; everyone: number } | null;
  /** A group poll: how many people the group has (results open for everyone when they have all voted, or at the end). */
  groupSize: number | null;
  /** True while a group poll waits for its group: nobody sees results yet, not even voters. */
  groupWaiting: boolean;
  /** "Called it": a question about a real event. `outcome` is the choice that came true, once the creator marked it. */
  calledIt: boolean;
  outcome: string | null;
  /** Opened from a friend's link: whether that friend exists, and their pick once you can see results. */
  friend: { known: boolean; optionId: string | null };
  /** The maker's name and face, only when they chose to show them on this poll. */
  maker: { id: string; name: string; avatar: string } | null;
  /** Voters may suggest a missing choice (the maker approves it first). */
  suggestionsOn: boolean;
  /** "Ask again": the earlier poll this one repeats, with its result when anyone may see it. */
  previous: { id: string; title: string; leader: string | null; percent: number | null; voters: number } | null;
  /** "Which dates work?": this voter's "if need be" dates. */
  myMaybes: string[];
  /** "Other (write your own)": the names written most often (by at least OTHER_MIN_PEOPLE people), only when results
   *  are visible; and what this voter wrote. */
  otherTop: { name: string; n: number }[];
  myOther: string | null;
  options: PollOption[];
};

function parseReasons(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** Friends needed before "your group vs everyone" shows, so no single friend's vote can be worked out from it. */
export const GROUP_MIN = 3;

/** Whole-percent share of your group (you + friends) and of everyone who picked your choice. */
export function groupSplit(friendsAll: number, friendsAgree: number, everyoneMine: number, everyoneTotal: number) {
  if (friendsAll < GROUP_MIN || !everyoneTotal) return null;
  return { size: friendsAll + 1, mine: Math.round(((friendsAgree + 1) / (friendsAll + 1)) * 100), everyone: Math.round((everyoneMine / everyoneTotal) * 100) };
}

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
/** "Ask again" may only point at an earlier poll by the same person. */
async function ownsPoll(db: Db, id: string, ownerId: string): Promise<boolean> {
  const [p] = await db.select({ ownerId: polls.ownerId }).from(polls).where(eq(polls.id, id)).limit(1);
  return !!p && p.ownerId === ownerId;
}

/** `manageKey`: the creator's private key (kept on their phone); only its hash is stored. */
export async function createPoll(db: Db, raw: CreatePollInput, manageKey?: string, packId?: string, ownerId?: string): Promise<string> {
  // A rating poll always has the same five steps, whatever was sent.
  const input = raw.kind === 'rating' ? { ...raw, options: RATING_LABELS, emojis: RATING_EMOJIS, photos: [] } : raw;
  const id = pollId();
  // Photos get their own short ids; the choice points at /api/img/<id>.
  const photoIds = input.options.map((_, n) => (input.photos[n] ? nanoid(12) : null));
  const hasPhotos = photoIds.some(Boolean);
  // One transaction: a duel is never saved without its choices (or with half its photos).
  await db.transaction(async (tx) => {
  const category = namesPolitics(input.title, input.description, ...input.options) ? 'politics' : input.category;
  const calledIt = input.calledIt && input.kind === 'choice' && category !== 'politics';
  // "Other (write your own)": pick-one ballots only, and not "Called it" (the maker marks one of the listed answers).
  const allowOther = input.allowOther && input.kind === 'choice' && !calledIt;
  await tx.insert(polls).values({
    hasPhotos,
    allowOther,
    // "Called it" is for pick-one questions about sport, films, shows and the like; never politics (election law).
    calledIt,
    manageHash: manageKey ? hashKey(manageKey) : null,
    packId: packId ?? null,
    ownerId: ownerId ?? null,
    groupSize: input.groupSize ?? null,
    shuffle: input.shuffle && (input.kind === 'choice' || input.kind === 'multi' || input.kind === 'rank'),
    suggestionsOn: input.suggestionsOn && (input.kind === 'choice' || input.kind === 'multi') && !input.groupSize,
    showMaker: input.showMaker && !!ownerId,
    previousId: input.previousId && ownerId && (await ownsPoll(tx as unknown as Db, input.previousId, ownerId)) ? input.previousId : null,
    electionMode: input.electionMode,
    kind: input.kind,
    id,
    title: input.title,
    description: input.description,
    // A duel that names a politician or party is politics, whatever was picked: silence windows and the review hold apply.
    category,
    hideUntilVoted: input.hideUntilVoted,
    // "Called it": your call cannot move after the event (someone could switch to the real winner before it is marked).
    allowChange: input.allowChange && !calledIt,
    // A group poll always has an end, so one friend who never votes cannot keep the group waiting for ever.
    endsAt: input.endsAt ? new Date(input.endsAt) : input.groupSize ? new Date(Date.now() + GROUP_DEFAULT_DAYS * 86_400_000) : null,
  });
  if (hasPhotos) {
    await tx.insert(photos).values(
      photoIds.flatMap((pid, n) => (pid ? [{ id: pid, pollId: id, data: input.photos[n].slice(input.photos[n].indexOf(',') + 1) }] : [])),
    );
  }
  await tx.insert(options).values(
    input.options.map((label, position) => ({
      id: nanoid(10),
      pollId: id,
      label,
      position,
      emoji: input.emojis[position] || null,
      imageUrl: photoIds[position] ? `/api/img/${photoIds[position]}` : null,
    })),
  );
  if (allowOther) await tx.insert(options).values({ id: nanoid(10), pollId: id, label: 'Other', position: input.options.length, isOther: true });
  });
  return id;
}

/** A voter's own fixed order for a shuffled poll: a number from the voter and the choice (same every visit). */
const orderKey = (voterId: string, optionId: string) => parseInt(createHash('sha256').update(`${voterId}:${optionId}`).digest('hex').slice(0, 8), 16);

async function makerOf(db: Db, uid: string) {
  const [u] = await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  return u ?? null;
}

/** "Ask again": the earlier poll's result, only as far as anyone may see it (its leader once results are public). */
async function previousResult(db: Db, pid: string): Promise<PollView['previous']> {
  const p = await getPoll(db, pid, null, null, { noPrevious: true });
  if (!p) return null;
  const lead = p.resultsVisible && p.totalVotes ? [...p.options].sort((a, b) => b.percent - a.percent)[0] : null;
  return { id: p.id, title: p.title, leader: lead?.label ?? null, percent: lead ? Math.round(lead.percent) : null, voters: p.participants };
}

export async function getPoll(
  db: Db,
  id: string,
  voterId: string | null,
  via?: string | null,
  flags: { includeHidden?: boolean; noPrevious?: boolean } = {},
): Promise<PollView | null> {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll || (poll.hidden && !flags.includeHidden)) return null;

  const [optsInOrder, counts, mine, reasonRows, pulseRows, reactionRows, myReactionRows] = await Promise.all([
    db.select().from(options).where(eq(options.pollId, id)).orderBy(options.position),
    db
      .select({ optionId: votes.optionId, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.pollId, id))
      .groupBy(votes.optionId),
    voterId
      ? db
          .select({
            optionId: votes.optionId,
            reason: votes.reason,
            otherText: votes.otherText,
            createdAt: votes.createdAt,
            prediction: votes.prediction,
            predictionCorrect: votes.predictionCorrect,
            shareCode: votes.shareCode,
          })
          .from(votes)
          .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
          .limit(1)
      : Promise.resolve(
          [] as { optionId: string; reason: string | null; otherText: string | null; createdAt: Date; prediction: string | null; predictionCorrect: boolean | null; shareCode: string | null }[],
        ),
    db
      .select({ optionId: votes.optionId, reason: votes.reason, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(and(eq(votes.pollId, id), sql`${votes.reason} is not null`))
      .groupBy(votes.optionId, votes.reason),
    db
      .select({
        lastHour: sql<number>`count(*) filter (where ${votes.createdAt} > now() - interval '1 hour')::int`,
        lastVoteAt: sql<string | null>`max(${votes.createdAt})`,
      })
      .from(votes)
      .where(eq(votes.pollId, id)),
    db
      .select({ emoji: reactions.emoji, n: sql<number>`count(*)::int` })
      .from(reactions)
      .where(eq(reactions.pollId, id))
      .groupBy(reactions.emoji),
    voterId
      ? db.select({ emoji: reactions.emoji }).from(reactions).where(and(eq(reactions.pollId, id), eq(reactions.voterKey, voterId)))
      : Promise.resolve([] as { emoji: string }[]),
  ]);

  // Shuffled polls: each voter gets their own fixed order (the same every visit), so no choice gains from being first.
  // Not for scales and dates (they have a natural order), nor the EVM (a ballot keeps its serial order).
  const opts =
    poll.shuffle && voterId && poll.kind !== 'rating' && poll.kind !== 'dates' && !poll.electionMode && poll.category !== 'politics'
      ? [...optsInOrder].sort((a, b) => orderKey(voterId, a.id) - orderKey(voterId, b.id))
      : optsInOrder;
  // "Pick several": a voter can count for several choices. `total` stays the number of voters (percent = share of voters).
  // "Rank": each place earns points (first of N gets N-1, last gets 0); a choice's score is its points.
  // "Which dates work?": like pick several, where a date's count is its "yes" answers (rank 1); "if need be" is rank 2.
  const dated = poll.kind === 'dates';
  const multi = poll.kind === 'multi' || dated;
  const ranked = poll.kind === 'rank';
  const picksKind = multi || ranked;
  const pickRows = picksKind
    ? await db
        .select({ optionId: votePicks.optionId, rank: votePicks.rank, n: sql<number>`count(*)::int` })
        .from(votePicks)
        .where(eq(votePicks.pollId, id))
        .groupBy(votePicks.optionId, votePicks.rank)
    : [];
  const pointsOf = (optionId: string) => pickRows.filter((x) => x.optionId === optionId).reduce((sum, x) => sum + x.n * (opts.length - (x.rank ?? opts.length)), 0);
  const byOption = new Map(
    multi
      ? opts.map((o) => [o.id, pickRows.filter((x) => x.optionId === o.id && (!dated || x.rank !== 2)).reduce((sum, x) => sum + x.n, 0)] as const)
      : ranked
        ? opts.map((o) => [o.id, pointsOf(o.id)] as const)
        : counts.map((c) => [c.optionId, c.n] as const),
  );
  const total = counts.reduce((s, c) => s + c.n, 0);
  // The most points a choice could have: every voter put it first.
  const maxPoints = total * Math.max(1, opts.length - 1);
  const avgPlace = (optionId: string) => {
    const rows = pickRows.filter((x) => x.optionId === optionId && x.rank);
    const n = rows.reduce((sum, x) => sum + x.n, 0);
    return n ? Math.round((rows.reduce((sum, x) => sum + x.n * (x.rank ?? 0), 0) / n) * 10) / 10 : null;
  };
  const myPickRows =
    picksKind && mine[0] && voterId
      ? await db
          .select({ optionId: votePicks.optionId, rank: votePicks.rank })
          .from(votePicks)
          .innerJoin(votes, eq(votes.id, votePicks.voteId))
          .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
          .orderBy(votePicks.rank)
      : [];
  const myMaybes = dated ? myPickRows.filter((x) => x.rank === 2).map((x) => x.optionId) : [];
  const myPicks = picksKind ? myPickRows.filter((x) => !dated || x.rank !== 2).map((x) => x.optionId) : mine[0] ? [mine[0].optionId] : [];
  const closed = !!poll.endsAt && poll.endsAt.getTime() <= Date.now();
  const myVote = mine[0]?.optionId ?? null;
  // Guess first, then see: on hidden-results duels you answer "who's winning?" before the numbers show.
  // During an election silence window, politics duels show no numbers and ask no exit poll, to anyone.
  const sealed = sealedUntil(poll.category);
  // Not while yours is the only vote: "who's winning?" needs someone else's vote to be a question.
  // A group poll waiting for its group: closed results for everyone. Group polls ask no crowd guess at all: while
  // waiting its answer would tell who leads, and once all have voted there is no crowd left to guess.
  const groupWaiting = !!poll.groupSize && !closed && total < poll.groupSize;
  // "Called it": the vote itself is the prediction, so there is no second "who's winning?" guess.
  const needsGuess = !poll.groupSize && !poll.calledIt && poll.kind !== 'dates' && !sealed && poll.hideUntilVoted && !closed && myVote !== null && mine[0]?.prediction == null && opts.length >= 2 && total >= 2;
  const resultsVisible = !sealed && !groupWaiting && (!poll.hideUntilVoted || closed || (myVote !== null && !needsGuess));

  // Your share code (made on first need, also for votes from before share codes existed).
  let myShareCode = mine[0]?.shareCode ?? null;
  if (mine[0] && !myShareCode && voterId) {
    myShareCode = shareCodeId();
    await db.update(votes).set({ shareCode: myShareCode }).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)));
  }
  const friendRows = myShareCode
    ? await db
        .select({ agree: sql<number>`count(*) filter (where ${votes.optionId} = ${myVote})::int`, all: sql<number>`count(*)::int` })
        .from(votes)
        .where(and(eq(votes.pollId, id), eq(votes.via, myShareCode)))
    : [];
  if (!isCode(via)) via = null;
  const friendVote = via
    ? (await db.select({ optionId: votes.optionId, voterKey: votes.voterKey }).from(votes).where(and(eq(votes.pollId, id), eq(votes.shareCode, via))).limit(1))[0]
    : undefined;
  const friendKnown = !!friendVote && friendVote.voterKey !== voterId;

  const myVoterNumber = mine[0]
    ? (
        await db
          .select({ n: sql<number>`count(*)::int` })
          .from(votes)
          // Compared inside the database: JS dates lose Postgres's microseconds and would skip your own vote.
          .where(
            and(
              eq(votes.pollId, id),
              sql`${votes.createdAt} <= (select v2.created_at from votes v2 where v2.poll_id = ${id} and v2.voter_key = ${voterId})`,
            ),
          )
      )[0]?.n ?? null
    : null;
  // Race line, counting rounds and swing follow single votes; a "pick several" poll does without them.
  const trend = !picksKind && resultsVisible && opts.length === 2 && total > 1 ? await shareOverTime(db, id, poll.createdAt, opts[0].id) : [];
  const [rounds, swing] = !picksKind && resultsVisible && total > 0 ? await Promise.all([countingRounds(db, id), swingSince(db, id, byOption, total)]) : [[], null];
  const lastVote = pulseRows[0]?.lastVoteAt;
  // "Other (write your own)": names written by several people, grouped however they were typed ("yogi" = "Yogi "),
  // shown with their most common spelling. Hidden results stay hidden: nothing here until the numbers show.
  const otherTop =
    poll.allowOther && resultsVisible
      ? (
          await db
            .select({
              name: sql<string>`mode() within group (order by ${votes.otherText})`,
              n: sql<number>`count(*)::int`,
            })
            .from(votes)
            .where(and(eq(votes.pollId, id), sql`${votes.otherText} is not null`))
            .groupBy(sql`lower(regexp_replace(trim(${votes.otherText}), '[[:space:]]+', ' ', 'g'))`)
            .having(sql`count(*) >= ${OTHER_MIN_PEOPLE}`)
            .orderBy(sql`count(*) desc`, sql`1`)
            .limit(OTHER_TOP)
        ).map((r) => ({ name: r.name, n: r.n }))
      : [];

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    category: poll.category,
    hideUntilVoted: poll.hideUntilVoted,
    allowChange: poll.allowChange,
    endsAt: poll.endsAt?.toISOString() ?? null,
    closed,
    totalVotes: resultsVisible ? total : 0,
    participants: total,
    myVote,
    resultsVisible,
    featured: poll.featured,
    reviewed: poll.reviewed,
    // Same rule as listPolls: held until the owner looks (politics, photos); group polls are never listed anyway.
    heldForReview: !poll.reviewed && !poll.groupSize && (poll.category === 'politics' || poll.hasPhotos),
    sealedUntil: sealed,
    pausedUntil: poll.frozenUntil && poll.frozenUntil.getTime() > Date.now() ? poll.frozenUntil.toISOString() : null,
    reasons: parseReasons(poll.reasons),
    myReason: mine[0]?.reason ?? null,
    pulse: { lastHour: pulseRows[0]?.lastHour ?? 0, lastVoteAt: lastVote ? new Date(lastVote).toISOString() : null },
    myVoterNumber,
    trend,
    rounds,
    swing,
    reactions: REACTIONS.map((e) => ({ emoji: e, n: reactionRows.find((r) => r.emoji === e)?.n ?? 0 })),
    myReactions: myReactionRows.map((r) => r.emoji),
    needsGuess,
    myGuess:
      // Sealed: "your exit poll was right" would tell who leads.
      !sealed && mine[0]?.prediction && mine[0].prediction !== 'skip' && mine[0].prediction !== 'alone' ? { optionId: mine[0].prediction, correct: !!mine[0].predictionCorrect } : null,
    myShareCode,
    electionMode: poll.electionMode || poll.category === 'politics',
    kind: poll.kind === 'rating' || poll.kind === 'multi' || poll.kind === 'rank' || poll.kind === 'dates' ? poll.kind : 'choice',
    myMaybes,
    otherTop,
    myOther: mine[0]?.otherText ?? null,
    maker: poll.showMaker && poll.ownerId ? await makerOf(db, poll.ownerId) : null,
    suggestionsOn: poll.suggestionsOn && (poll.kind === 'choice' || poll.kind === 'multi') && !poll.groupSize && !closed,
    previous: poll.previousId && !flags.noPrevious ? await previousResult(db, poll.previousId) : null,
    myPicks,
    groupSize: poll.groupSize,
    groupWaiting,
    calledIt: poll.calledIt,
    outcome: poll.calledIt ? poll.outcome : null,
    myShareProof: myShareCode ? shareProof(myShareCode) : null,
    // How your friends voted tells who leads, so it waits for the results too.
    friends: !resultsVisible ? { agree: 0, disagree: 0 } : { agree: friendRows[0]?.agree ?? 0, disagree: (friendRows[0]?.all ?? 0) - (friendRows[0]?.agree ?? 0) },
    group:
      resultsVisible && myVote !== null && !picksKind && poll.kind !== 'rating'
        ? groupSplit(friendRows[0]?.all ?? 0, friendRows[0]?.agree ?? 0, byOption.get(myVote) ?? 0, total)
        : null,
    // The friend's pick stays a surprise until you have voted (and guessed).
    friend: { known: friendKnown, optionId: friendKnown && myVote !== null && resultsVisible ? friendVote!.optionId : null },
    options: opts.map((o) => {
      const n = resultsVisible ? (byOption.get(o.id) ?? 0) : 0;
      return {
        id: o.id,
        label: o.label,
        imageUrl: o.imageUrl,
        subtitle: o.subtitle,
        imageCredit: o.imageCredit,
        emoji: o.emoji,
        isOther: o.isOther,
        votes: n,
        // Rank: score as a share of the most points possible; others: share of voters.
        percent: resultsVisible && total ? (ranked ? (n / maxPoints) * 100 : (n / total) * 100) : 0,
        avgPlace: resultsVisible && ranked ? avgPlace(o.id) : null,
        maybe: resultsVisible && dated ? pickRows.filter((x) => x.optionId === o.id && x.rank === 2).reduce((sum, x) => sum + x.n, 0) : 0,
        reasons: resultsVisible
          ? reasonRows.filter((r) => r.optionId === o.id && r.reason).map((r) => ({ reason: r.reason as string, n: r.n })).sort((a, b) => b.n - a.n)
          : [],
      };
    }),
  };
}

/** Counting day: split the votes into 3 rounds by the time they were cast, and give the running total per option after each round. Real data, so the lead can really swing. */
async function countingRounds(db: Db, id: string): Promise<Record<string, number>[]> {
  const sq = db
    .select({ optionId: votes.optionId, r: sql<number>`ntile(3) over (order by ${votes.createdAt}, ${votes.id})`.as('r') })
    .from(votes)
    .where(eq(votes.pollId, id))
    .as('sq');
  const rows = await db.select({ optionId: sq.optionId, r: sq.r, n: sql<number>`count(*)::int` }).from(sq).groupBy(sq.optionId, sq.r);
  const out: Record<string, number>[] = [];
  const running: Record<string, number> = {};
  for (const round of [1, 2, 3]) {
    for (const row of rows) if (Number(row.r) === round) running[row.optionId] = (running[row.optionId] ?? 0) + row.n;
    out.push({ ...running });
  }
  return out;
}

/** The leader's share now minus their share 24 hours ago. Needs at least 5 votes from before, and a change since. */
async function swingSince(db: Db, id: string, now: Map<string, number>, total: number) {
  const before = await db
    .select({ optionId: votes.optionId, n: sql<number>`count(*)::int` })
    .from(votes)
    .where(and(eq(votes.pollId, id), sql`${votes.createdAt} <= now() - interval '24 hours'`))
    .groupBy(votes.optionId);
  const beforeTotal = before.reduce((s, r) => s + r.n, 0);
  if (beforeTotal < 5 || beforeTotal === total) return null;
  const leader = [...now.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!leader) return null;
  const then = ((before.find((r) => r.optionId === leader)?.n ?? 0) / beforeTotal) * 100;
  const points = Math.round(((now.get(leader) ?? 0) / total) * 100 - then);
  return points === 0 ? null : { optionId: leader, points };
}

/** The first option's running share, bucketed by hour (or by day for older polls). At most 48 points. */
async function shareOverTime(db: Db, id: string, createdAt: Date, firstOptionId: string) {
  const unit = Date.now() - createdAt.getTime() > 3 * 24 * 3600_000 ? 'day' : 'hour';
  const rows = await db
    .select({
      // India days (a UTC day would split at 5:30 am India time).
      bucket: sql<string>`date_trunc(${unit}, ${votes.createdAt} at time zone ${INDIA_TZ})`,
      a: sql<number>`count(*) filter (where ${votes.optionId} = ${firstOptionId})::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(votes)
    .where(eq(votes.pollId, id))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  let a = 0;
  let n = 0;
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  // Skip the first few votes: with 1-2 votes the share is always 0% or 100%, which tells nothing.
  const warmUp = Math.min(10, Math.ceil(total * 0.15));
  const points: { t: string; a: number }[] = [];
  for (const r of rows) {
    a += r.a;
    n += r.n;
    if (n >= warmUp) points.push({ t: new Date(r.bucket).toISOString(), a: (a / n) * 100 });
  }
  return points.slice(-48);
}

export type VoteResult = 'ok' | 'changed' | 'already_voted' | 'closed' | 'not_found' | 'bad_option' | 'bad_other' | 'frozen';

export async function castVote(db: Db, id: string, optionId: string, voterId: string, via?: string | null, morePicks: string[] = [], maybes: string[] = [], other?: string | null): Promise<VoteResult> {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll || poll.hidden) return 'not_found';
  if (poll.endsAt && poll.endsAt.getTime() <= Date.now()) return 'closed';
  // Paused after a flood of votes (src/lib/flood.ts) until the time runs out or the owner resumes it.
  if (poll.frozenUntil && poll.frozenUntil.getTime() > Date.now()) return 'frozen';
  // "Pick several": every ticked choice must belong to this poll (the first one is the vote row's own choice).
  // "Rank": the list is the order, first = #1, and every choice must be placed.
  // "Which dates work?": the yes dates and the "if need be" dates (a date is one or the other).
  const maybeSet = new Set(poll.kind === 'dates' ? maybes : []);
  const picks = usesPicks(poll.kind) ? [...new Set([optionId, ...morePicks, ...maybeSet])] : [optionId];
  const valid = await db.select({ id: options.id, isOther: options.isOther }).from(options).where(and(eq(options.pollId, id), inArray(options.id, picks)));
  if (valid.length !== picks.length) return 'bad_option';
  // "Other (write your own)": the name is required, short, and passes the word filter. Any other choice keeps none.
  const isOther = poll.kind === 'choice' && valid.some((o) => o.id === optionId && o.isOther);
  const otherText = isOther ? cleanText(other ?? '').slice(0, MAX_OTHER + 1) : null;
  if (isOther && (!otherText || otherText.length > MAX_OTHER || !/[\p{L}\p{N}]/u.test(otherText) || hasBlockedWord(otherText))) return 'bad_other';
  // A politician written under "Other" makes it a politics poll, like a political choice would (review hold, election
  // silence windows), so the most-written names never show outside those rules.
  if (otherText && poll.category !== 'politics' && namesPolitics(otherText)) {
    await db.update(polls).set({ category: 'politics', reviewed: false, calledIt: false }).where(eq(polls.id, id));
  }
  if (poll.kind === 'rank') {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(options).where(eq(options.pollId, id));
    if (picks.length !== n) return 'bad_option';
  }

  // Only keep "via" when it is a real share code for this duel from someone else.
  let viaCode: string | null = null;
  if (isCode(via)) {
    const [ref] = await db.select({ voterKey: votes.voterKey }).from(votes).where(and(eq(votes.pollId, id), eq(votes.shareCode, via))).limit(1);
    if (ref && ref.voterKey !== voterId) viaCode = via;
  }
  const newVote = { id: nanoid(12), pollId: id, optionId, otherText, voterKey: voterId, prediction: null, shareCode: shareCodeId(), via: viaCode };

  // The ticks of a "pick several" vote, written with the vote itself (all or nothing).
  const savePicks = async (tx: Db, voteId: string) => {
    if (!usesPicks(poll.kind)) return;
    await tx.delete(votePicks).where(eq(votePicks.voteId, voteId));
    await tx.insert(votePicks).values(picks.map((o, k) => ({ voteId, pollId: id, optionId: o, rank: poll.kind === 'rank' ? k + 1 : poll.kind === 'dates' ? (maybeSet.has(o) ? 2 : 1) : null })));
  };

  if (poll.allowChange) {
    // One atomic statement: first vote inserts, a later vote moves it.
    return db.transaction(async (tx) => {
      await lockPoll(tx as unknown as Db, id);
      const [row] = await tx
        .insert(votes)
        .values(newVote)
        .onConflictDoUpdate({ target: [votes.pollId, votes.voterKey], set: { optionId, otherText, reason: null } })
        .returning({ id: votes.id, created: sql<boolean>`(xmax = 0)` });
      await savePicks(tx as unknown as Db, row.id);
      return row?.created ? 'ok' : 'changed';
    });
  }
  // Unique index decides, so two fast taps can never count twice.
  return db.transaction(async (tx) => {
    await lockPoll(tx as unknown as Db, id);
    const inserted = await tx
      .insert(votes)
      .values(newVote)
      .onConflictDoNothing()
      .returning({ id: votes.id });
    if (!inserted.length) return 'already_voted';
    await savePicks(tx as unknown as Db, inserted[0].id);
    return 'ok';
  });
}

/** A vote holds the poll row (shared) while it is written, so a typo fix (which takes it whole) cannot change a
 * choice's words between its "nobody has voted" check and its save. */
async function lockPoll(tx: Db, id: string) {
  await tx.select({ id: polls.id }).from(polls).where(eq(polls.id, id)).for('share');
}

/** "Who's winning right now?": checked against the live count (your vote included) at the moment you answer. */
export async function guessLeader(db: Db, id: string, voterId: string, choice: string): Promise<'ok' | 'not_found' | 'not_allowed' | 'bad_option'> {
  const [poll] = await db
    .select({ category: polls.category, hidden: polls.hidden, hideUntilVoted: polls.hideUntilVoted, endsAt: polls.endsAt, groupSize: polls.groupSize, calledIt: polls.calledIt, kind: polls.kind })
    .from(polls)
    .where(eq(polls.id, id))
    .limit(1);
  if (!poll || poll.hidden) return 'not_found';
  // Group, "Called it" and dates polls ask no crowd guess (getPoll never offers one; this stops a hand-made request too).
  if (poll.groupSize || poll.calledIt || poll.kind === 'dates') return 'not_allowed';
  // Only while the numbers are still hidden: a "guess" made while looking at the results is not a guess.
  const closed = !!poll.endsAt && poll.endsAt.getTime() <= Date.now();
  if (sealedUntil(poll.category) || !poll.hideUntilVoted || closed) return 'not_allowed';
  const [v] = await db
    .select({ prediction: votes.prediction })
    .from(votes)
    .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
    .limit(1);
  if (!v || v.prediction != null) return 'not_allowed';
  const [{ kind }] = await db.select({ kind: polls.kind }).from(polls).where(eq(polls.id, id));
  // "Pick several": the leader is the most-ticked choice. "Rank": the one with the most points.
  const counts = kind === 'rank' ? await rankPoints(db, [id]) : await db
    .select({ optionId: options.id, n: sql<number>`count(${kind === 'multi' ? votePicks.voteId : votes.id})::int` })
    .from(options)
    .leftJoin(kind === 'multi' ? votePicks : votes, kind === 'multi' ? eq(votePicks.optionId, options.id) : eq(votes.optionId, options.id))
    .where(eq(options.pollId, id))
    .groupBy(options.id);
  // Only your own vote is in: nothing to guess, so it is not counted as a right (or wrong) call.
  if (counts.reduce((sum, c) => sum + c.n, 0) < 2) {
    // 'alone': you only saw your own vote, so taking it back (undo) stays allowed.
    await db.update(votes).set({ prediction: 'alone' }).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId), isNull(votes.prediction)));
    return 'ok';
  }
  if (choice === 'skip') {
    // Only if no guess is in yet: a skip sent at the same moment as a guess must not overwrite it.
    await db.update(votes).set({ prediction: 'skip' }).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId), isNull(votes.prediction)));
    return 'ok';
  }
  if (!counts.some((c) => c.optionId === choice)) return 'bad_option';
  const top = Math.max(...counts.map((c) => c.n));
  const correct = counts.some((c) => c.optionId === choice && c.n === top); // a tie: any leader counts
  await db
    .update(votes)
    .set({ prediction: choice, predictionCorrect: correct })
    .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId), sql`${votes.prediction} is null`));
  return 'ok';
}

/** Search engines only get a poll page once this many people voted in it (thin pages look like spam). */
export const INDEX_MIN_VOTES = 10;

export type PollSummary = { id: string; title: string; category: string; kind: PollKind; totalVotes: number; lastHour: number; options: string[]; closed: boolean; /** The creator's emoji per choice ('' when none), in choice order. */ emojis: string[]; /** A "Called it" question about a real event. */ calledIt: boolean };

/** Vote counts for a few public polls (the same count as listPolls), for lists that tick up while open. Hidden and
 * group polls are never counted here. */
export async function voteTotals(db: Db, ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const rows = await db
    .select({ id: polls.id, total: sql<number>`count(${votes.id})::int` })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(and(inArray(polls.id, ids), eq(polls.hidden, false), isNull(polls.groupSize)))
    .groupBy(polls.id);
  return Object.fromEntries(rows.map((r) => [r.id, r.total]));
}

/** How many different people (voter numbers) have voted on the site, for Home's "N people have voted here". */
export async function voterCount(db: Db): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(distinct ${votes.voterKey})::int` }).from(votes);
  return row?.n ?? 0;
}

/** Public duels, newest first. Hidden duels never; unreviewed politics duels not until the owner checks them. */
export async function listPolls(db: Db, limit = 20, filter: { category?: string; reviewedOnly?: boolean; q?: string; before?: Date } = {}): Promise<PollSummary[]> {
  // Search: words in the question or in any choice ("chai" finds "Tea or coffee?" if a choice is Chai).
  // % and _ are typed as plain letters, not wildcards.
  const q = filter.q?.trim().slice(0, 60);
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%` : '';
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      category: polls.category,
      kind: polls.kind,
      endsAt: polls.endsAt,
      calledIt: polls.calledIt,
      totalVotes: sql<number>`count(${votes.id})::int`,
      lastHour: sql<number>`count(${votes.id}) filter (where ${votes.createdAt} > now() - interval '1 hour')::int`,
    })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(
      and(
        // Today's question has its own banner, so the list leaves it out; a search finds it like any other.
        q ? undefined : eq(polls.featured, false),
        eq(polls.hidden, false),
        // Group polls are for the group's link only, never in public lists or search.
        isNull(polls.groupSize),
        // Held until the owner looks: politics duels, and duels with photos from people's phones.
        filter.reviewedOnly ? eq(polls.reviewed, true) : or(eq(polls.reviewed, true), and(ne(polls.category, 'politics'), eq(polls.hasPhotos, false))),
        filter.category ? eq(polls.category, filter.category) : undefined,
        filter.before ? lt(polls.createdAt, filter.before) : undefined,
        q ? sql`(${polls.title} ilike ${like} or exists (select 1 from options o where o.poll_id = polls.id and o.label ilike ${like}))` : undefined,
      ),
    )
    .groupBy(polls.id)
    .orderBy(desc(polls.createdAt))
    .limit(limit);
  if (!rows.length) return [];
  const opts = await db
    .select({ pollId: options.pollId, label: options.label, emoji: options.emoji, position: options.position })
    .from(options)
    // "Other" is left out of list lines ("A vs B"): it is not a named choice, and its stored word is English only.
    .where(and(inArray(options.pollId, rows.map((r) => r.id)), eq(options.isOther, false)))
    .orderBy(options.position);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    kind: r.kind === 'rating' || r.kind === 'multi' || r.kind === 'rank' || r.kind === 'dates' ? r.kind : 'choice',
    totalVotes: r.totalVotes,
    lastHour: r.lastHour,
    closed: !!r.endsAt && r.endsAt.getTime() <= Date.now(),
    options: opts.filter((o) => o.pollId === r.id).map((o) => o.label),
    emojis: opts.filter((o) => o.pollId === r.id).map((o) => o.emoji ?? ''),
    calledIt: r.calledIt,
  }));
}

/** Id of today's question (picked by the owner from people's polls), if there is one. */
export async function getFeaturedId(db: Db): Promise<string | null> {
  // A poll the owner planned for today (a festival, a match day) takes over by itself on its morning, with the 9 pm
  // final count, so the owner does not have to be online that day. No timer needed: the first visit of the day does it.
  const [planned] = await db
    .select({ id: polls.id, featured: polls.featured })
    .from(polls)
    .where(and(eq(polls.todayOn, indiaDay().label), eq(polls.hidden, false)))
    .orderBy(desc(polls.createdAt))
    .limit(1);
  if (planned) {
    if (!planned.featured) await setToday(db, planned.id, true);
    return planned.id;
  }
  const [row] = await db.select({ id: polls.id }).from(polls).where(and(eq(polls.featured, true), eq(polls.hidden, false))).orderBy(desc(polls.createdAt)).limit(1);
  return row?.id ?? null;
}

export type PlannedToday = { id: string; title: string; day: string };

/** The owner plans a poll as Today's question for a day ("2026-11-08"), or clears it (null). Today or later only. */
export async function planToday(db: Db, id: string, day: string | null): Promise<boolean> {
  // A real calendar day only ("2026-02-31" is refused: it would be saved and never come).
  if (day !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day || day < indiaDay().label)) return false;
  const updated = await db.update(polls).set({ todayOn: day }).where(and(eq(polls.id, id), eq(polls.hidden, false))).returning({ id: polls.id });
  return updated.length > 0;
}

/** What is planned from today on, soonest first. */
export async function getPlannedToday(db: Db): Promise<PlannedToday[]> {
  const rows = await db
    .select({ id: polls.id, title: polls.title, day: polls.todayOn })
    .from(polls)
    .where(and(sql`${polls.todayOn} >= ${indiaDay().label}`, eq(polls.hidden, false)))
    .orderBy(polls.todayOn)
    .limit(60);
  return rows.map((r) => ({ id: r.id, title: r.title, day: r.day! }));
}

/** Saves the voter's one-tap "why". Only allowed answers, only for a vote they already cast. */
export async function setReason(db: Db, id: string, voterId: string, reason: string): Promise<boolean> {
  const [poll] = await db.select({ reasons: polls.reasons }).from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1);
  if (!poll || !parseReasons(poll.reasons).includes(reason)) return false;
  const updated = await db
    .update(votes)
    .set({ reason })
    .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
    .returning({ id: votes.id });
  return updated.length > 0;
}

/** Adds or removes one emoji reaction. Only people who voted can react. */
export async function toggleReaction(db: Db, id: string, voterId: string, emoji: string): Promise<boolean> {
  if (!(REACTIONS as readonly string[]).includes(emoji)) return false;
  if (!(await isVisible(db, id))) return false;
  const [v] = await db.select({ id: votes.id }).from(votes).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId))).limit(1);
  if (!v) return false;
  const removed = await db
    .delete(reactions)
    .where(and(eq(reactions.pollId, id), eq(reactions.voterKey, voterId), eq(reactions.emoji, emoji)))
    .returning({ e: reactions.emoji });
  if (!removed.length) await db.insert(reactions).values({ pollId: id, voterKey: voterId, emoji }).onConflictDoNothing();
  return true;
}

export type VoterStats = { votes: number; today: number; guesses: number; correct: number; friends: number };

const EMPTY_STATS: VoterStats = { votes: 0, today: 0, guesses: 0, correct: 0, friends: 0 };

/** Your totals: votes, today's votes, "who's winning" guesses (and how many were right), friends who answered your dares. */
export async function getVoterStats(db: Db, voterId: string | null): Promise<VoterStats> {
  if (!voterId) return EMPTY_STATS;
  const [mineRow] = await db
    .select({
      votes: sql<number>`count(*)::int`,
      today: sql<number>`count(*) filter (where ${votes.createdAt} >= (date_trunc('day', now() at time zone ${INDIA_TZ}) at time zone ${INDIA_TZ}))::int`,
      guesses: sql<number>`count(*) filter (where ${votes.predictionCorrect} is not null)::int`,
      correct: sql<number>`count(*) filter (where ${votes.predictionCorrect})::int`,
    })
    .from(votes)
    .where(eq(votes.voterKey, voterId));
  const [friendRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(votes)
    .where(sql`${votes.via} in (select v2.share_code from votes v2 where v2.voter_key = ${voterId} and v2.share_code is not null)`);
  return { ...EMPTY_STATS, ...mineRow, friends: friendRow?.n ?? 0 };
}

/** "Today's question": the owner picks one poll for the top of Home (the old one steps down). Hidden polls cannot be picked. */
/** When today's final count happens: 9 pm India time (the evening peak), tonight or, after 9 pm, tomorrow. */
export const FINAL_HOUR_IST = 21;
export function nextFinalCount(now = Date.now()): Date {
  const { label } = indiaDay(now);
  const tonight = new Date(`${label}T${String(FINAL_HOUR_IST).padStart(2, '0')}:00:00${INDIA_OFFSET}`);
  return tonight.getTime() > now + 30 * 60_000 ? tonight : new Date(tonight.getTime() + 86400_000);
}

/**
 * Makes a poll today's question. With closeTonight (the owner's tick, on by default) it gets a real final count at
 * 9 pm India time: a reason to come back in the evening, and a moment for group admins to post "here is how we voted".
 * A poll that already has an earlier end keeps it; the time is real, never a fake countdown.
 */
export async function setToday(db: Db, id: string, closeTonight = false): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ id: polls.id, endsAt: polls.endsAt }).from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1);
    if (!row) return false;
    const final = nextFinalCount();
    const endsAt = closeTonight && (!row.endsAt || row.endsAt.getTime() > final.getTime()) ? final : row.endsAt;
    await tx.update(polls).set({ featured: false }).where(eq(polls.featured, true));
    // Picked by hand today: it wins over anything else planned for today.
    await tx.update(polls).set({ todayOn: null }).where(and(eq(polls.todayOn, indiaDay().label), ne(polls.id, id)));
    await tx.update(polls).set({ featured: true, reviewed: true, endsAt }).where(eq(polls.id, id));
    return true;
  });
}

/**
 * "Trending now": recent votes count most, and every poll slowly sinks as it ages (the open Hacker News idea):
 * score = votes in the last 24 hours / (hours since it started + 2)^1.5. Polls with reports sink faster.
 * Same public rules as listPolls (no hidden, held or closed polls; not today's question).
 */
export async function trendingPolls(db: Db, limit = 6): Promise<PollSummary[]> {
  const list = await listPolls(db, 200);
  if (!list.length) return [];
  const ids = list.filter((p) => !p.closed).map((p) => p.id);
  if (!ids.length) return [];
  const rows = await db
    .select({
      id: polls.id,
      // Written out in full: inside a sub-select a bare "id" would mean the vote's id, not the poll's.
      recent: sql<number>`(select count(*)::int from votes v where v.poll_id = polls.id and v.created_at > now() - interval '24 hours')`,
      hours: sql<number>`extract(epoch from (now() - polls.created_at)) / 3600`,
      reports: sql<number>`(select count(*)::int from reports r where r.poll_id = polls.id)`,
    })
    .from(polls)
    .where(inArray(polls.id, ids));
  const score = (r: (typeof rows)[number]) => (Number(r.recent) / Math.pow(Number(r.hours) + 2, 1.5)) / (1 + Number(r.reports));
  const ranked = rows.filter((r) => Number(r.recent) > 0).sort((a, b) => score(b) - score(a)).slice(0, limit);
  const top = ranked.map((r) => list.find((p) => p.id === r.id)!).filter(Boolean);
  // Fair discovery: once the shelf is full of popular polls, its last spot goes to the newest poll with few votes, so
  // the rich do not just get richer (MusicLab: showing counts makes winners win more). The list is newest first.
  if (top.length >= 3 && top.length === limit) {
    const fresh = list.find((p) => !p.closed && p.totalVotes < 10 && !top.some((x) => x.id === p.id));
    if (fresh) top[top.length - 1] = fresh;
  }
  return top;
}

/** The duels to play through: the featured one first, then the newest. */
export async function getDeck(db: Db, voterId: string | null, limit = 12): Promise<PollView[]> {
  const [featuredId, list] = await Promise.all([getFeaturedId(db), listPolls(db, limit)]);
  const ids = [...(featuredId ? [featuredId] : []), ...list.filter((p) => !p.closed).map((p) => p.id)].slice(0, limit);
  const views = await Promise.all(ids.map((id) => getPoll(db, id, voterId)));
  return views.filter((v): v is PollView => v !== null);
}

/** How many polls make "today's set". */
export const SET_SIZE = 5;

/** Midnight in India today (the day a set belongs to), and its label like "2026-10-04". */
export function indiaDay(now = Date.now()) {
  const ist = new Date(now + 5.5 * 3600_000);
  const label = ist.toISOString().slice(0, 10);
  return { label, start: new Date(`${label}T00:00:00${INDIA_OFFSET}`) };
}

// A fixed shuffle for the day: the same order for everyone, a new one tomorrow (FNV-1a hash of day + id).
function dayHash(day: string, id: string) {
  let h = 2166136261;
  for (const c of `${day}:${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Today's set: today's question first, then a few more polls, the same for everyone all day (a shared moment, like
 * Wordle's one puzzle a day) with a clear end. Only polls that existed before today's midnight, so the set never
 * changes during the day; shuffled by the day, not by votes, so new polls get their turn (popular ones do not take
 * every slot); one per topic first, for variety.
 */
export async function getTodaySet(db: Db, voterId: string | null, size = SET_SIZE): Promise<PollView[]> {
  const day = indiaDay();
  const [featuredId, list] = await Promise.all([getFeaturedId(db), listPolls(db, 200, { before: day.start })]);
  const open = list.filter((p) => !p.closed && p.id !== featuredId).sort((a, b) => dayHash(day.label, a.id) - dayHash(day.label, b.id));
  const picked: PollSummary[] = [];
  const topics = new Set<string>();
  for (const p of open) if (picked.length < size - (featuredId ? 1 : 0) && !topics.has(p.category)) (picked.push(p), topics.add(p.category));
  for (const p of open) if (picked.length < size - (featuredId ? 1 : 0) && !picked.includes(p)) picked.push(p);
  const ids = [...(featuredId ? [featuredId] : []), ...picked.map((p) => p.id)];
  // A young site (most polls made today): top up with the newest, so there is always a set to play.
  if (ids.length < size) {
    for (const p of await listPolls(db, 50)) if (ids.length < size && !p.closed && !ids.includes(p.id)) ids.push(p.id);
  }
  const views = await Promise.all(ids.map((id) => getPoll(db, id, voterId)));
  // Today's question stays in the set after its final count, so evening visitors see how it ended.
  return views.filter((v): v is PollView => v !== null && (!v.closed || v.id === featuredId));
}

/** Where a duel you voted in stands now, as far as you are allowed to see (same rules as getPoll). */
export type Standing =
  | { kind: 'leading' | 'won'; name: string; percent: number }
  | { kind: 'rating'; average: number }
  /** A group poll still waiting for its group. */
  | { kind: 'group'; voted: number; of: number }
  /** "Called it": what happened, and whether your pick was it. */
  | { kind: 'called'; name: string; right: boolean }
  | { kind: 'tie' | 'tied' | 'guess' | 'sealed' | 'none' };
export type MyVote = { pollId: string; title: string; pick: string; at: string; standing: Standing; voters: number };

/** The duels this voter took part in, newest first, with how each one stands now. */
export async function getMyVotes(db: Db, voterId: string | null, limit = 50): Promise<MyVote[]> {
  if (!voterId) return [];
  const rows = await db
    .select({
      pollId: votes.pollId,
      title: polls.title,
      pick: sql<string>`coalesce(${votes.otherText}, ${options.label})`,
      pickEmoji: options.emoji,
      pollKind: polls.kind,
      at: votes.createdAt,
      prediction: votes.prediction,
      category: polls.category,
      hideUntilVoted: polls.hideUntilVoted,
      endsAt: polls.endsAt,
      optionId: votes.optionId,
      outcome: polls.outcome,
      groupSize: polls.groupSize,
      calledIt: polls.calledIt,
    })
    .from(votes)
    .innerJoin(polls, eq(polls.id, votes.pollId))
    .innerJoin(options, eq(options.id, votes.optionId))
    .where(and(eq(votes.voterKey, voterId), eq(polls.hidden, false)))
    .orderBy(desc(votes.createdAt))
    .limit(limit);
  if (!rows.length) return [];
  const counts = await db
    .select({ pollId: options.pollId, optionId: options.id, label: options.label, n: sql<number>`count(${votes.id})::int` })
    .from(options)
    .leftJoin(votes, eq(votes.optionId, options.id))
    .where(inArray(options.pollId, rows.map((r) => r.pollId)))
    .groupBy(options.pollId, options.id, options.label);
  // "Pick several" polls: count every tick, and show all of this voter's ticks.
  const multiIds = rows.filter((r) => usesPicks(r.pollKind)).map((r) => r.pollId);
  const rankIds = rows.filter((r) => r.pollKind === 'rank').map((r) => r.pollId);
  const [tickCounts, myTicks, rankCounts] = multiIds.length
    ? await Promise.all([
        db
          .select({ pollId: options.pollId, label: options.label, n: sql<number>`count(${votePicks.voteId})::int` })
          .from(options)
          // A dates poll's "if need be" (rank 2) is not a yes, as in getPoll. (Rank polls' rows here are not used.)
          .leftJoin(votePicks, and(eq(votePicks.optionId, options.id), or(isNull(votePicks.rank), ne(votePicks.rank, 2))))
          .where(inArray(options.pollId, multiIds))
          .groupBy(options.pollId, options.id, options.label),
        db
          .select({ pollId: votePicks.pollId, label: options.label, rank: votePicks.rank })
          .from(votePicks)
          .innerJoin(votes, eq(votes.id, votePicks.voteId))
          .innerJoin(options, eq(options.id, votePicks.optionId))
          .where(and(eq(votes.voterKey, voterId), inArray(votePicks.pollId, multiIds)))
          .orderBy(votePicks.rank, options.position),
        rankIds.length ? rankPoints(db, rankIds) : Promise.resolve([] as { pollId: string; optionId: string; label: string; n: number }[]),
      ])
    : [[], [], []];
  const pickCounts = [...tickCounts.filter((c) => !rankIds.includes(c.pollId)), ...rankCounts];
  return rows.map((r) => {
    const closed = !!r.endsAt && r.endsAt.getTime() <= Date.now();
    const multi = usesPicks(r.pollKind);
    // Voters per poll (each vote row has exactly one first choice).
    const total = counts.filter((c) => c.pollId === r.pollId).reduce((s, c) => s + c.n, 0);
    const mine = (multi ? pickCounts : counts).filter((c) => c.pollId === r.pollId).sort((a, b) => b.n - a.n);
    let standing: Standing;
    const happened = r.outcome ? counts.find((c) => c.optionId === r.outcome) : undefined;
    if (happened) standing = { kind: 'called', name: happened.label, right: r.optionId === r.outcome };
    else if (r.groupSize && !closed && total < r.groupSize) standing = { kind: 'group', voted: total, of: r.groupSize };
    else if (sealedUntil(r.category)) standing = { kind: 'sealed' };
    // (Group and "Called it" polls never ask for a crowd guess.)
    else if (!r.groupSize && !r.calledIt && r.pollKind !== 'dates' && r.hideUntilVoted && !closed && r.prediction == null && mine.length >= 2 && total >= 2) standing = { kind: 'guess' };
    else if (!total) standing = { kind: 'none' };
    else if (r.pollKind === 'rating') standing = { kind: 'rating', average: ratingAverage([1, 2, 3, 4, 5].map((v) => mine.find((c) => c.label === String(v))?.n ?? 0)) ?? 0 };
    // "Called it" closed but not yet answered: the most-called choice has not "won", the event decides.
    else if (mine.length > 1 && mine[0].n === mine[1].n) standing = { kind: closed && !r.calledIt ? 'tied' : 'tie' };
    else standing = { kind: closed && !r.calledIt ? 'won' : 'leading', name: mine[0].label, percent: Math.round((mine[0].n / (r.pollKind === 'rank' ? total * Math.max(1, mine.length - 1) : total)) * 100) };
    // A rating vote shows as its face ("🙂 4"), not as a bare number.
    const pick =
      r.pollKind === 'rating' ? `${r.pickEmoji ?? ''} ${r.pick}/5`.trim()
      : r.pollKind === 'rank' ? myTicks.filter((x) => x.pollId === r.pollId).map((x) => `${x.rank}. ${x.label}`).join(', ') || r.pick
      : multi ? myTicks.filter((x) => x.pollId === r.pollId).map((x) => x.label).join(', ') || r.pick
      : r.pick;
    return { pollId: r.pollId, title: r.title, pick, at: r.at.toISOString(), standing, voters: total };
  });
}

const isVisible = async (db: Db, id: string) =>
  (await db.select({ id: polls.id }).from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1)).length > 0;

/** Rank polls: points per choice (first of N gets N-1, last gets 0), for the crowd guess and My votes. */
async function rankPoints(db: Db, pollIds: string[]): Promise<{ pollId: string; optionId: string; label: string; n: number }[]> {
  const [opts, rows] = await Promise.all([
    db.select({ pollId: options.pollId, optionId: options.id, label: options.label }).from(options).where(inArray(options.pollId, pollIds)),
    db
      .select({ optionId: votePicks.optionId, rank: votePicks.rank, n: sql<number>`count(*)::int` })
      .from(votePicks)
      .where(inArray(votePicks.pollId, pollIds))
      .groupBy(votePicks.optionId, votePicks.rank),
  ]);
  const size = (pollId: string) => opts.filter((o) => o.pollId === pollId).length;
  return opts.map((o) => ({
    ...o,
    n: rows.filter((x) => x.optionId === o.optionId).reduce((sum, x) => sum + x.n * (size(o.pollId) - (x.rank ?? size(o.pollId))), 0),
  }));
}

/** How long after voting you can still take it back (an accidental tap). */
export const UNDO_SECONDS = 30;

/** Removes your vote (and its reactions) if you cast it in the last few seconds. */
export async function undoVote(db: Db, id: string, voterId: string): Promise<boolean> {
  if (!(await isVisible(db, id))) return false;
  // Polls that show hidden results straight after the vote, with no crowd guess first ("Called it", dates, a group
  // poll its last voter completes): the voter has seen the numbers, so no undo (they could vote again for the leader).
  const [p] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  // Not once the poll has ended (or while it is paused): the final count and its alerts must not change afterwards.
  if (!p || (p.endsAt && p.endsAt.getTime() <= Date.now()) || (p.frozenUntil && p.frozenUntil.getTime() > Date.now())) return false;
  // A group poll's results open for everyone when the group is complete, whatever "hide results" says.
  if (!sealedUntil(p.category) && (p.groupSize || (p.hideUntilVoted && (p.calledIt || p.kind === 'dates')))) {
    if (!p.groupSize) return false;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(votes).where(eq(votes.pollId, id));
    if (n >= p.groupSize) return false;
  }
  const removed = await db
    .delete(votes)
    .where(
      and(
        eq(votes.pollId, id),
        eq(votes.voterKey, voterId),
        sql`${votes.createdAt} > now() - make_interval(secs => ${UNDO_SECONDS})`,
        // Not after the exit poll: by then you have seen the numbers, and could vote again for the leader.
        or(isNull(votes.prediction), eq(votes.prediction, 'alone')),
      ),
    )
    .returning({ id: votes.id });
  if (!removed.length) return false;
  await db.delete(reactions).where(and(eq(reactions.pollId, id), eq(reactions.voterKey, voterId)));
  return true;
}

// ---- Reports and the owner's review (docs/DESIGN.md, "Safety") ----

export const REPORT_REASONS = ['hate', 'false', 'private', 'me', 'spam', 'other'] as const;
/** Distinct reports that take an unreviewed duel down at once, until the owner looks (the law asks for removal within hours). */
export const AUTO_HIDE_REPORTS = 3;
/** Reports about a photo ("private or sexual photo", "this is me"): the law gives 2 hours for intimate images, so a poll
 *  with photos comes down at the first one, until the owner looks (they can put it back from /admin). */
const PHOTO_REASONS: readonly string[] = ['private', 'me'];

/** Saves a report. Returns false for an unknown poll or reason; otherwise the poll's title and whether it is now hidden
 *  (for the owner's phone alert). */
export async function reportPoll(db: Db, id: string, voterId: string, reason: string, ipHash: string | null = null): Promise<false | { title: string; hidden: boolean }> {
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return false;
  const [poll] = await db
    .select({ id: polls.id, title: polls.title, reviewed: polls.reviewed, hasPhotos: polls.hasPhotos })
    .from(polls)
    .where(and(eq(polls.id, id), eq(polls.hidden, false)))
    .limit(1);
  if (!poll) return false;
  await db.insert(reports).values({ pollId: id, voterKey: voterId, reason, ipHash }).onConflictDoNothing();
  let hide = poll.hasPhotos && PHOTO_REASONS.includes(reason);
  if (!hide && !poll.reviewed) {
    // Distinct people: one network clearing its cookies three times still counts once.
    const [{ n }] = await db
      .select({ n: sql<number>`count(distinct coalesce(${reports.ipHash}, ${reports.voterKey}))::int` })
      .from(reports)
      .where(eq(reports.pollId, id));
    hide = n >= AUTO_HIDE_REPORTS;
  }
  if (hide) await db.update(polls).set({ hidden: true }).where(eq(polls.id, id));
  return { title: poll.title, hidden: hide };
}

export type ReviewItem = { id: string; title: string; options: string[]; photos: string[]; category: string; hidden: boolean; reviewed: boolean; reports: number; reasons: string[]; createdAt: string; paused: boolean; firstReportAt: string | null };

/** What the owner should look at: reported duels first, then unreviewed ones, newest first. */
export async function getReviewQueue(db: Db, limit = 100): Promise<ReviewItem[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      category: polls.category,
      hidden: polls.hidden,
      reviewed: polls.reviewed,
      createdAt: polls.createdAt,
      reports: sql<number>`count(${reports.voterKey})::int`,
      reasons: sql<string | null>`string_agg(distinct ${reports.reason}, ',')`,
      paused: sql<boolean>`coalesce(${polls.frozenUntil} > now(), false)`,
      firstReportAt: sql<string | null>`min(${reports.createdAt})`,
    })
    .from(polls)
    .leftJoin(reports, eq(reports.pollId, polls.id))
    .groupBy(polls.id)
    // A poll its maker deleted leaves the queue, unless it was reported (the owner may still have to act on that).
    .having(sql`(count(${reports.voterKey}) > 0 or not ${polls.reviewed} or ${polls.hidden} or coalesce(${polls.frozenUntil} > now(), false)) and (${polls.deletedAt} is null or count(${reports.voterKey}) > 0)`)
    // Most urgent first: paused by a flood, then reported (photo reports first: the 2-hour rule), then the rest.
    .orderBy(
      sql`coalesce(${polls.frozenUntil} > now(), false) desc`,
      sql`bool_or(${reports.reason} in ('private', 'me')) desc nulls last`,
      sql`count(${reports.voterKey}) desc`,
      desc(polls.createdAt),
    )
    .limit(limit);
  const opts = rows.length
    ? await db.select({ pollId: options.pollId, label: options.label, imageUrl: options.imageUrl }).from(options).where(inArray(options.pollId, rows.map((r) => r.id))).orderBy(options.position)
    : [];
  return rows.map((r) => ({
    ...r,
    options: opts.filter((o) => o.pollId === r.id).map((o) => o.label),
    // Photos people added from their phone, so the owner can look at them right here.
    photos: opts.filter((o) => o.pollId === r.id && o.imageUrl?.startsWith('/api/img/')).map((o) => o.imageUrl!),
    reasons: r.reasons ? r.reasons.split(',') : [],
    createdAt: r.createdAt.toISOString(),
    firstReportAt: r.firstReportAt ? new Date(r.firstReportAt).toISOString() : null,
  }));
}

/** The owner hides, shows or approves a duel. Approving also clears its reports. */
export async function setPollFlags(db: Db, id: string, flags: { hidden?: boolean; reviewed?: boolean }): Promise<boolean> {
  // A poll its maker deleted stays down: "Show again" cannot bring it back.
  const updated = await db.update(polls).set(flags).where(flags.hidden === false ? and(eq(polls.id, id), isNull(polls.deletedAt)) : eq(polls.id, id)).returning({ id: polls.id });
  if (updated.length && flags.reviewed) await db.delete(reports).where(eq(reports.pollId, id));
  return updated.length > 0;
}

/** "Delete my votes": everything stored for this voter (votes, reactions, reports). Friends' links to your share code stop counting. */
export async function deleteVoterData(db: Db, voterId: string): Promise<number> {
  await db.delete(reactions).where(eq(reactions.voterKey, voterId));
  await db.delete(reports).where(eq(reports.voterKey, voterId));
  // Push addresses (and so every "tell me the result" on them) go too.
  await db.delete(schema.pushSubs).where(eq(schema.pushSubs.voterKey, voterId));
  const removed = await db.delete(votes).where(eq(votes.voterKey, voterId)).returning({ id: votes.id });
  return removed.length;
}

/** "Called it": the creator (with their private key) or the owner marks which choice came true. Voting closes then. */
export async function setOutcome(db: Db, id: string, optionId: string, key: string): Promise<'ok' | 'not_found' | 'not_allowed' | 'bad_option' | 'done' | 'taken'> {
  const [poll] = await db.select().from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1);
  if (!poll || !poll.calledIt) return 'not_found';
  const creator = !!poll.manageHash && poll.manageHash.length === 64 && timingSafeEqual(Buffer.from(poll.manageHash), Buffer.from(hashKey(key)));
  if (!creator && !isAdminKey(key)) return 'not_allowed';
  // Marked already: the same answer again is fine (a second tap), a different one is refused (it is final).
  if (poll.outcome) return poll.outcome === optionId ? 'done' : 'taken';
  const [opt] = await db.select({ id: options.id }).from(options).where(and(eq(options.id, optionId), eq(options.pollId, id))).limit(1);
  if (!opt) return 'bad_option';
  const now = new Date();
  // Closing it (end time = now) lets every "closed" rule apply: no more votes, results open to all.
  const set = await db
    .update(polls)
    .set({ outcome: optionId, outcomeAt: now, endsAt: poll.endsAt && poll.endsAt < now ? poll.endsAt : now })
    .where(and(eq(polls.id, id), isNull(polls.outcome)))
    .returning({ id: polls.id });
  return set.length ? 'ok' : 'taken';
}
