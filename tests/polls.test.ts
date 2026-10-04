import { beforeAll, describe, expect, it } from 'vitest';
import {
  AUTO_HIDE_REPORTS, castVote, createPoll, deleteVoterData, getDeck, getFeaturedId, getMyVotes, getPoll, getReviewQueue, getVoterStats, guessLeader, listPolls,
  GROUP_MIN, groupSplit, reportPoll, setPollFlags, setReason, setToday, toggleReaction, undoVote,
} from '@/lib/polls';
import { hasBlockedWord, namesPolitics } from '@/lib/moderation';
import { activeSilence } from '@/lib/silence';
import { createPollSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { schema, type Db } from '@/db';
import { eq, inArray, sql } from 'drizzle-orm';

let db: Db;
beforeAll(async () => {
  // Set TEST_DATABASE_URL to an empty Postgres database to run against the real driver.
  process.env.PGLITE_DIR = 'memory://';
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  else delete process.env.DATABASE_URL;
  db = await (await import('@/db')).getDb();
});

// Results open by default in these tests; the guess game is tested on its own below.
const make = (extra = {}) =>
  createPoll(db, createPollSchema.parse({ title: 'Best finisher?', options: ['Virat', 'Rohit', 'Dhoni'], hideUntilVoted: false, ...extra }));

describe('counting day', () => {
  it('counts in 3 rounds that add up to the final result, and never before results are visible', async () => {
    const id = await make();
    const p = (await getPoll(db, id, null))!;
    const picks = [0, 0, 1, 2, 1, 1, 0];
    for (const [k, n] of picks.entries()) await castVote(db, id, p.options[n].id, `c${k}`);
    const after = (await getPoll(db, id, 'c0'))!;
    expect(after.rounds).toHaveLength(3);
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    expect(after.rounds.map(sum)).toEqual([3, 5, 7]); // ntile(3) of 7 votes: 3, 2, 2
    expect(after.rounds[2]).toEqual(Object.fromEntries(after.options.map((o) => [o.id, o.votes])));
    const hidden = await make({ hideUntilVoted: true });
    const h = (await getPoll(db, hidden, null))!;
    await castVote(db, hidden, h.options[0].id, 'x');
    const viewer = (await getPoll(db, hidden, 'someone-else'))!;
    expect(viewer.rounds).toEqual([]);
    expect(viewer.swing).toBeNull();
  });

  it('shows the swing in the last 24 hours only with enough history', async () => {
    const id = await make();
    const p = (await getPoll(db, id, null))!;
    for (let k = 0; k < 6; k++) await castVote(db, id, p.options[k < 3 ? 0 : 1].id, `old${k}`);
    expect((await getPoll(db, id, 'old0'))!.swing).toBeNull(); // no votes older than 24 h yet
    await db.update(schema.votes).set({ createdAt: sql`now() - interval '2 days'` }).where(eq(schema.votes.pollId, id));
    for (let k = 0; k < 4; k++) await castVote(db, id, p.options[0].id, `new${k}`);
    const after = (await getPoll(db, id, 'old0'))!;
    // Then: Virat 3 of 6 = 50%. Now: 7 of 10 = 70%. Swing +20 for the leader.
    expect(after.swing).toEqual({ optionId: p.options[0].id, points: 20 });
  });
});

describe('voting', () => {
  it('counts one vote per voter, even with many tries', async () => {
    const id = await make();
    const p = (await getPoll(db, id, null))!;
    expect(await castVote(db, id, p.options[0].id, 'a')).toBe('ok');
    expect(await castVote(db, id, p.options[1].id, 'a')).toBe('already_voted');
    const results = await Promise.all(Array.from({ length: 5 }, () => castVote(db, id, p.options[2].id, 'b')));
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    const after = (await getPoll(db, id, 'a'))!;
    expect(after.totalVotes).toBe(2);
    expect(after.myVote).toBe(p.options[0].id);
    expect(after.options.map((o) => o.votes)).toEqual([1, 0, 1]);
    expect(after.options[0].percent).toBe(50);
  });

  it('lets a voter change their vote when allowed', async () => {
    const id = await make({ allowChange: true });
    const p = (await getPoll(db, id, null))!;
    expect(await castVote(db, id, p.options[0].id, 'a')).toBe('ok');
    expect(await castVote(db, id, p.options[1].id, 'a')).toBe('changed');
    const after = (await getPoll(db, id, 'a'))!;
    expect(after.totalVotes).toBe(1);
    expect(after.myVote).toBe(p.options[1].id);
  });

  it('rejects options from another poll and unknown polls', async () => {
    const a = await make();
    const b = await make();
    const pb = (await getPoll(db, b, null))!;
    expect(await castVote(db, a, pb.options[0].id, 'x')).toBe('bad_option');
    expect(await castVote(db, 'nope', pb.options[0].id, 'x')).toBe('not_found');
  });

  it('hides results until the voter has voted', async () => {
    const id = await make({ hideUntilVoted: true });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'a');
    await castVote(db, id, p.options[1].id, 'b'); // with only your own vote there is no exit poll
    const stranger = (await getPoll(db, id, 'zzz'))!;
    expect(stranger.resultsVisible).toBe(false);
    expect(stranger.totalVotes).toBe(0);
    expect(stranger.options.every((o) => o.votes === 0)).toBe(true);
    expect((await getPoll(db, id, 'a'))!.resultsVisible).toBe(false); // voted, not guessed yet
    expect((await getPoll(db, id, 'a'))!.needsGuess).toBe(true);
    expect(await guessLeader(db, id, 'a', 'skip')).toBe('ok');
    expect((await getPoll(db, id, 'a'))!.resultsVisible).toBe(true);
  });

  it('refuses votes after the poll ended', async () => {
    const id = await make();
    const p = (await getPoll(db, id, null))!;
    const { schema } = await import('@/db');
    const { eq } = await import('drizzle-orm');
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    expect(await castVote(db, id, p.options[0].id, 'a')).toBe('closed');
    expect((await getPoll(db, id, null))!.closed).toBe(true);
  });
});

describe('listing', () => {
  it('shows the right vote count and choices for each poll', async () => {
    const id = await make({ title: 'Listing check' });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'u1');
    await castVote(db, id, p.options[1].id, 'u2');
    const item = (await listPolls(db, 100)).find((x) => x.id === id)!;
    expect(item.totalVotes).toBe(2);
    expect(item.options).toEqual(['Virat', 'Rohit', 'Dhoni']);
  });

  it('searches the question and the choices, ignoring case, with % and _ as plain letters', async () => {
    const id = await make({ title: 'Morning drink zqx?', options: ['Masala Chai', 'Filter coffee'] });
    const odd = await make({ title: 'Is 100% zqx_odd fair?' });
    const ids = async (q: string) => (await listPolls(db, 100, { q })).map((p) => p.id);
    expect(await ids('DRINK ZQX')).toContain(id);
    expect(await ids('masala chai')).toContain(id);
    expect(await ids('zqx%odd')).not.toContain(odd);
    expect(await ids('100%')).toContain(odd);
    expect(await ids('zqx_odd')).toEqual([odd]);
    expect(await ids('zqx_')).toEqual([odd]);
    expect(await ids('no such poll at all qq')).toEqual([]);
  });
});

describe('every poll is made by a person', () => {
  it('the site adds no polls of its own, and the old seeded ones stay retired', async () => {
    const { SEEDED_IDS, retireSeeded } = await import('@/db/retire');
    const rows = await db.select({ id: schema.polls.id }).from(schema.polls).where(inArray(schema.polls.id, SEEDED_IDS));
    expect(rows).toEqual([]);
    // An old database that still has one: retired the first time only (the owner can show it again for good).
    await db.execute(sql`delete from app_migrations`);
    await db.insert(schema.polls).values({ id: 'chai-or-coffee', title: 'Chai or coffee?', reviewed: true });
    await retireSeeded(db);
    expect(await getPoll(db, 'chai-or-coffee', null)).toBeNull();
    await setPollFlags(db, 'chai-or-coffee', { hidden: false, reviewed: true });
    await retireSeeded(db);
    expect(await getPoll(db, 'chai-or-coffee', null)).not.toBeNull();
  });
});

describe('reasons', () => {
  it('saves a reason only for allowed answers and only after voting', async () => {
    const id = await make({ title: 'Why this one?', hideUntilVoted: true });
    await db.update(schema.polls).set({ reasons: JSON.stringify(['Leadership', 'Vision']) }).where(eq(schema.polls.id, id));
    const first = (await getPoll(db, id, null))!.options[0].id;
    expect(await setReason(db, id, 'nobody', 'Leadership')).toBe(false); // has not voted
    await castVote(db, id, first, 'r1');
    await guessLeader(db, id, 'r1', 'skip');
    expect(await setReason(db, id, 'r1', 'Made up reason')).toBe(false);
    expect(await setReason(db, id, 'r1', 'Leadership')).toBe(true);
    const mine = (await getPoll(db, id, 'r1'))!;
    expect(mine.myReason).toBe('Leadership');
    expect(mine.options[0].reasons).toEqual([{ reason: 'Leadership', n: 1 }]);
    const stranger = (await getPoll(db, id, 'zzz'))!; // has not voted, results hidden
    expect(stranger.options[0].reasons).toEqual([]);
  });
});

describe('engagement', () => {
  it('numbers voters in order and shows live activity', async () => {
    const id = await make({ title: 'Engagement check' });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'e1');
    await castVote(db, id, p.options[1].id, 'e2');
    await castVote(db, id, p.options[0].id, 'e3');
    expect((await getPoll(db, id, 'e1'))!.myVoterNumber).toBe(1);
    expect((await getPoll(db, id, 'e3'))!.myVoterNumber).toBe(3);
    const stranger = (await getPoll(db, id, 'nobody'))!;
    expect(stranger.myVoterNumber).toBeNull();
    expect(stranger.pulse.lastHour).toBe(3);
    expect(stranger.pulse.lastVoteAt).not.toBeNull();
  });

  it('never leaks the trend while results are hidden', async () => {
    const id = await make({ title: 'Hidden trend', options: ['A', 'B'], hideUntilVoted: true });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'h1');
    await castVote(db, id, p.options[1].id, 'h2');
    await guessLeader(db, id, 'h1', 'skip');
    expect((await getPoll(db, id, 'nobody'))!.trend).toEqual([]);
    const seen = (await getPoll(db, id, 'h1'))!.trend;
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1].a).toBe(50);
  });

  it('toggles reactions, only for voters and only allowed emoji', async () => {
    const id = await make({ title: 'Reactions' });
    const p = (await getPoll(db, id, null))!;
    expect(await toggleReaction(db, id, 'x1', '🔥')).toBe(false); // has not voted
    await castVote(db, id, p.options[0].id, 'x1');
    expect(await toggleReaction(db, id, 'x1', '💩')).toBe(false);
    expect(await toggleReaction(db, id, 'x1', '🔥')).toBe(true);
    let v = (await getPoll(db, id, 'x1'))!;
    expect(v.reactions.find((r) => r.emoji === '🔥')!.n).toBe(1);
    expect(v.myReactions).toEqual(['🔥']);
    await toggleReaction(db, id, 'x1', '🔥'); // tap again removes it
    v = (await getPoll(db, id, 'x1'))!;
    expect(v.reactions.find((r) => r.emoji === '🔥')!.n).toBe(0);
    expect(v.myReactions).toEqual([]);
  });
});

describe('voter stats and deck', () => {
  it('counts votes and today', async () => {
    const empty = await getVoterStats(db, 'nobody-at-all');
    expect(empty).toMatchObject({ votes: 0, today: 0, guesses: 0, correct: 0, friends: 0 });
    const a = await make({ title: 'Stats one' });
    const b = await make({ title: 'Stats two' });
    await castVote(db, a, (await getPoll(db, a, null))!.options[0].id, 'st1');
    await castVote(db, b, (await getPoll(db, b, null))!.options[1].id, 'st1');
    const s = await getVoterStats(db, 'st1');
    expect(s).toMatchObject({ votes: 2, today: 2 });
  });

  it('puts the featured duel first', async () => {
    const pick = await make({ title: 'Featured first check' });
    await setToday(db, pick);
    const deck = await getDeck(db, null);
    expect(deck[0].id).toBe(pick);
    expect(deck.length).toBeGreaterThan(1);
  });
});

describe('undo', () => {
  it('takes back a fresh vote, but not an old one', async () => {
    const id = await make({ title: 'Undo check' });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'u-fresh');
    await toggleReaction(db, id, 'u-fresh', '🔥');
    expect(await undoVote(db, id, 'u-fresh')).toBe(true);
    const after = (await getPoll(db, id, 'u-fresh'))!;
    expect(after.myVote).toBeNull();
    expect(after.reactions.find((r) => r.emoji === '🔥')!.n).toBe(0);
    expect(await castVote(db, id, p.options[1].id, 'u-fresh')).toBe('ok'); // can vote again

    await castVote(db, id, p.options[0].id, 'u-old');
    const { schema } = await import('@/db');
    const { eq } = await import('drizzle-orm');
    await db.update(schema.votes).set({ createdAt: new Date(Date.now() - 120_000) }).where(eq(schema.votes.voterKey, 'u-old'));
    expect(await undoVote(db, id, 'u-old')).toBe(false);
  });
});

describe('guess the crowd', () => {
  it('asks once, checks against the live count, and opens the results', async () => {
    const id = await make({ title: 'Guess check', options: ['A', 'B'], hideUntilVoted: true });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'g1');
    await castVote(db, id, a.id, 'g2');
    await castVote(db, id, b.id, 'g3');
    expect(await guessLeader(db, id, 'nobody', a.id)).toBe('not_allowed');
    expect(await guessLeader(db, id, 'g3', 'not-an-option')).toBe('bad_option');
    expect(await guessLeader(db, id, 'g3', a.id)).toBe('ok');
    expect(await guessLeader(db, id, 'g3', b.id)).toBe('not_allowed');
    expect((await getPoll(db, id, 'g3'))!.myGuess).toEqual({ optionId: a.id, correct: true });
    expect(await guessLeader(db, id, 'g2', b.id)).toBe('ok');
    expect((await getPoll(db, id, 'g2'))!.myGuess).toEqual({ optionId: b.id, correct: false });
    expect(await getVoterStats(db, 'g3')).toMatchObject({ guesses: 1, correct: 1 });
  });

  it('counts a tie as right for either leader', async () => {
    const id = await make({ title: 'Tie guess', options: ['A', 'B'], hideUntilVoted: true });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 't1');
    await castVote(db, id, b.id, 't2');
    await guessLeader(db, id, 't1', b.id);
    expect((await getPoll(db, id, 't1'))!.myGuess?.correct).toBe(true);
  });
});

describe('friends', () => {
  it('links a friend through a share code and counts agree / disagree', async () => {
    const id = await make({ title: 'Friend check', options: ['A', 'B'] });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'sharer');
    const code = (await getPoll(db, id, 'sharer'))!.myShareCode!;
    expect(code).toBeTruthy();
    const before = (await getPoll(db, id, 'f1', code))!;
    expect(before.friend).toEqual({ known: true, optionId: null });
    await castVote(db, id, a.id, 'f1', code);
    await castVote(db, id, b.id, 'f2', code);
    await castVote(db, id, b.id, 'f3', 'made-up-code');
    expect((await getPoll(db, id, 'f1', code))!.friend).toEqual({ known: true, optionId: a.id });
    expect((await getPoll(db, id, 'sharer'))!.friends).toEqual({ agree: 1, disagree: 1 });
    expect((await getVoterStats(db, 'sharer')).friends).toBe(2);
    expect((await getPoll(db, id, 'sharer', code))!.friend.known).toBe(false);
  });

  it('shows my group vs everyone only with enough friends, and never before results', async () => {
    const id = await make({ title: 'Group check', options: ['A', 'B'] });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'g-sharer');
    const code = (await getPoll(db, id, 'g-sharer'))!.myShareCode!;
    await castVote(db, id, a.id, 'g1', code);
    await castVote(db, id, b.id, 'g2', code);
    expect(GROUP_MIN).toBe(3);
    expect((await getPoll(db, id, 'g-sharer'))!.group).toBeNull(); // 2 friends: too few
    await castVote(db, id, a.id, 'g3', code);
    for (const v of ['o1', 'o2', 'o3', 'o4']) await castVote(db, id, b.id, v);
    // Group: me + g1 + g3 picked A of 4 = 75%. Everyone: 3 of 8 picked A = 38%.
    expect((await getPoll(db, id, 'g-sharer'))!.group).toEqual({ size: 4, mine: 75, everyone: 38 });
    expect(groupSplit(5, 0, 0, 0)).toBeNull();

    const hidden = await make({ title: 'Group hidden', options: ['A', 'B'], hideUntilVoted: true });
    const [ha] = (await getPoll(db, hidden, null))!.options;
    await castVote(db, hidden, ha.id, 'h-sharer');
    const hcode = (await getPoll(db, hidden, 'h-sharer'))!.myShareCode!;
    for (const v of ['h1', 'h2', 'h3']) await castVote(db, hidden, ha.id, v, hcode);
    expect((await getPoll(db, hidden, 'h-sharer'))!.group).toBeNull(); // has not guessed yet: results still hidden
  });
});

describe('validation', () => {
  it('needs 2 to 10 different choices', () => {
    expect(createPollSchema.safeParse({ title: 'Test poll', options: ['A'] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Test poll', options: ['A', 'a'] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Test poll', options: Array.from({ length: 11 }, (_, i) => `o${i}`) }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Test poll', options: ['A', 'B'] }).success).toBe(true);
  });
  it('rejects an end time in the past', () => {
    expect(createPollSchema.safeParse({ title: 'Test poll', options: ['A', 'B'], endsAt: '2020-01-01T00:00:00.000Z' }).success).toBe(false);
  });
});

describe('rate limit', () => {
  it('blocks after the limit', async () => {
    expect([await rateLimit('t', 2, 1000), await rateLimit('t', 2, 1000), await rateLimit('t', 2, 1000)]).toEqual([true, true, false]);
  });
});

describe('safety: word filter and politics hold', () => {
  it('refuses abuse in any script, but not normal words that contain it', () => {
    expect(hasBlockedWord('Who is the bigger chutiya?')).toBe(true);
    expect(hasBlockedWord('कौन है मादरचोद')).toBe(true);
    expect(hasBlockedWord('Scunthorpe or Class?', 'Bachchan')).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Randi or not', options: ['A', 'B'] }).success).toBe(false);
  });

  it('treats a duel naming a politician as politics, and keeps it off public lists until reviewed', async () => {
    expect(namesPolitics('Modi or Kejriwal?')).toBe(true);
    expect(namesPolitics('Aap kise chunoge?', 'Shahrukh')).toBe(false);
    const id = await make({ title: 'Kejriwal or Yogi?', options: ['Kejriwal', 'Yogi'], category: 'food' });
    expect((await getPoll(db, id, null))!.category).toBe('politics');
    expect((await listPolls(db, 500)).some((p) => p.id === id)).toBe(false);
    expect((await getPoll(db, id, null))!.reviewed).toBe(false); // the link still works
    await setPollFlags(db, id, { reviewed: true });
    expect((await listPolls(db, 500)).some((p) => p.id === id)).toBe(true);
    expect((await listPolls(db, 500, { category: 'politics' })).some((p) => p.id === id)).toBe(true);
  });

  it('only offers reviewed duels to search engines', async () => {
    const id = await make({ title: 'Unreviewed tea duel', options: ['Masala', 'Adrak'] });
    expect((await listPolls(db, 500)).some((p) => p.id === id)).toBe(true);
    expect((await listPolls(db, 500, { reviewedOnly: true })).some((p) => p.id === id)).toBe(false);
  });
});

describe('safety: reports and hiding', () => {
  it('hides an unreviewed duel after enough different people report it', async () => {
    const id = await make({ title: 'Reported duel' });
    const p = (await getPoll(db, id, null))!;
    expect(await reportPoll(db, id, 'rep0', 'not-a-reason')).toBe(false);
    for (let k = 0; k < AUTO_HIDE_REPORTS - 1; k++) await reportPoll(db, id, `rep${k}`, 'hate');
    await reportPoll(db, id, 'rep0', 'hate'); // the same person again does not count twice
    expect(await getPoll(db, id, null)).not.toBeNull();
    expect((await getReviewQueue(db)).find((r) => r.id === id)).toMatchObject({ reports: AUTO_HIDE_REPORTS - 1, reasons: ['hate'], options: ['Virat', 'Rohit', 'Dhoni'] });
    await reportPoll(db, id, 'rep-last', 'spam');
    expect(await getPoll(db, id, null)).toBeNull();
    expect(await castVote(db, id, p.options[0].id, 'late')).toBe('not_found');
    expect((await listPolls(db, 500)).some((x) => x.id === id)).toBe(false);
    expect(await getPoll(db, id, null, null, { includeHidden: true })).not.toBeNull();
    await setPollFlags(db, id, { hidden: false, reviewed: true }); // the owner approves: back up, reports cleared
    expect(await getPoll(db, id, null)).not.toBeNull();
    expect((await getReviewQueue(db)).some((r) => r.id === id)).toBe(false);
  });

  it('never auto-hides a reviewed duel (people cannot report a checked poll away)', async () => {
    const id = await make({ title: 'Checked by the owner' });
    await setPollFlags(db, id, { reviewed: true });
    for (let k = 0; k < AUTO_HIDE_REPORTS + 2; k++) await reportPoll(db, id, `mass${k}`, 'false');
    expect(await getPoll(db, id, null)).not.toBeNull();
  });
});

describe('election silence window', () => {
  it('seals politics results for everyone and skips the exit poll; other duels are not touched', async () => {
    const pol = await make({ title: 'Silence check', options: ['BJP', 'INC'], category: 'politics', hideUntilVoted: true });
    const fun = await make({ title: 'Silence fun check', options: ['Tea', 'Coffee'] });
    const [a] = (await getPoll(db, pol, null))!.options;
    const [x] = (await getPoll(db, fun, null))!.options;
    process.env.SILENCE_WINDOWS = JSON.stringify([{ from: new Date(Date.now() - 3600_000).toISOString(), to: new Date(Date.now() + 3600_000).toISOString() }]);
    try {
      expect(activeSilence()).not.toBeNull();
      expect(await castVote(db, pol, a.id, 's1')).toBe('ok'); // voting stays open
      const mine = (await getPoll(db, pol, 's1'))!;
      expect(mine.sealedUntil).not.toBeNull();
      expect(mine.resultsVisible).toBe(false);
      expect(mine.needsGuess).toBe(false);
      expect(mine.totalVotes).toBe(0);
      expect(mine.options.every((o) => o.votes === 0 && o.percent === 0)).toBe(true);
      expect(mine.participants).toBe(1); // turnout is fine to show
      expect(await guessLeader(db, pol, 's1', a.id)).toBe('not_allowed');
      await castVote(db, fun, x.id, 's1');
      expect((await getPoll(db, fun, 's1'))!.resultsVisible).toBe(true);
    } finally {
      delete process.env.SILENCE_WINDOWS;
    }
    expect(activeSilence()).toBeNull();
    await castVote(db, pol, (await getPoll(db, pol, null))!.options[1].id, 's2'); // the exit poll needs a second vote
    expect((await getPoll(db, pol, 's1'))!.needsGuess).toBe(true); // after the window: the normal flow again
  });
});

describe('privacy: delete my votes', () => {
  it('removes every vote, reaction and report of that voter only', async () => {
    const id = await make({ title: 'Delete check' });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'del-me');
    await castVote(db, id, p.options[1].id, 'keep-me');
    await toggleReaction(db, id, 'del-me', '🔥');
    await reportPoll(db, id, 'del-me', 'spam');
    expect(await deleteVoterData(db, 'del-me')).toBe(1);
    expect(await getMyVotes(db, 'del-me')).toEqual([]);
    const after = (await getPoll(db, id, 'keep-me'))!;
    expect(after.totalVotes).toBe(1);
    expect(after.reactions.find((r) => r.emoji === '🔥')!.n).toBe(0);
  });
});

describe('round 3: easier to use', () => {
  it('never gives two choices the same letters in their circle', async () => {
    const { faceLabels } = await import('@/lib/labels');
    expect(faceLabels(['Narendra Modi', 'Rahul Gandhi'])).toEqual(['NM', 'RG']);
    expect(faceLabels(['Chai', 'Coffee'])).toEqual(['Ch', 'Co']);
    expect(faceLabels(['Chai', 'Chaas', 'Lassi'])).toEqual(['1', '2', 'L']);
    expect(faceLabels(['🔥', 'Pizza'])).toEqual(['🔥', 'P']);
  });

  it('accepts one emoji per choice and stores it', async () => {
    const { isEmoji } = await import('@/lib/validation');
    for (const e of ['🔥', '👍🏽', '🇮🇳', '👨‍👩‍👧', '❤️']) expect(isEmoji(e)).toBe(true);
    for (const e of ['a', '🔥🔥', ':)', '🔥x']) expect(isEmoji(e)).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Emoji duel', options: ['A', 'B'], emojis: ['🔥', 'nope'] }).success).toBe(false);
    const id = await make({ title: 'Emoji duel', options: ['Tea', 'Coffee'], emojis: ['🍵', ''] });
    expect((await getPoll(db, id, null))!.options.map((o) => o.emoji)).toEqual(['🍵', null]);
  });

  it('shows on My votes where each duel stands, with the same visibility rules as the duel', async () => {
    const id = await make({ title: 'Standing check', options: ['A', 'B'], hideUntilVoted: true });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'm1');
    await castVote(db, id, a.id, 'm2');
    await castVote(db, id, b.id, 'm3');
    const mine = async () => (await getMyVotes(db, 'm1')).find((v) => v.pollId === id)!.standing;
    expect(await mine()).toEqual({ kind: 'guess' }); // exit poll not answered yet: no numbers
    await guessLeader(db, id, 'm1', 'skip');
    expect(await mine()).toEqual({ kind: 'leading', name: 'A', percent: 67 });
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    expect(await mine()).toEqual({ kind: 'won', name: 'A', percent: 67 });
    const tie = await make({ title: 'Standing tie', options: ['A', 'B'] });
    const [ta, tb] = (await getPoll(db, tie, null))!.options;
    await castVote(db, tie, ta.id, 'm1');
    await castVote(db, tie, tb.id, 'm4');
    expect((await getMyVotes(db, 'm1')).find((v) => v.pollId === tie)!.standing).toEqual({ kind: 'tie' });
  });

  it('counts votes in the last hour for "Most watched now"', async () => {
    const id = await make({ title: 'Hot duel' });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'hot1');
    await castVote(db, id, p.options[1].id, 'hot2');
    await db.update(schema.votes).set({ createdAt: sql`now() - interval '2 hours'` }).where(eq(schema.votes.voterKey, 'hot2'));
    expect((await listPolls(db, 500)).find((x) => x.id === id)).toMatchObject({ totalVotes: 2, lastHour: 1 });
  });
});

describe('edge cases (found in testing)', () => {
  it('no undo after the exit poll: you have seen the numbers by then', async () => {
    const id = await make({ title: 'Peek and switch', options: ['A', 'B'], hideUntilVoted: true });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'pk1');
    await castVote(db, id, b.id, 'peeker');
    expect(await guessLeader(db, id, 'peeker', 'skip')).toBe('ok');
    expect(await undoVote(db, id, 'peeker')).toBe(false);
    await castVote(db, id, a.id, 'quick');
    expect(await undoVote(db, id, 'quick')).toBe(true); // before the exit poll it still works
  });

  it('no exit poll guess when the numbers are already open, or the duel is gone', async () => {
    const open = await make({ title: 'Open results guess', options: ['A', 'B'] });
    const [a] = (await getPoll(db, open, null))!.options;
    await castVote(db, open, a.id, 'og1');
    expect(await guessLeader(db, open, 'og1', a.id)).toBe('not_allowed');
    expect(await guessLeader(db, 'no-such-duel', 'og1', a.id)).toBe('not_found');
  });

  it('keeps the friends tally hidden until your results open', async () => {
    const id = await make({ title: 'Friends wait', options: ['A', 'B'], hideUntilVoted: true });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'fw-sharer');
    const code = (await getPoll(db, id, 'fw-sharer'))!.myShareCode!;
    await castVote(db, id, b.id, 'fw-friend', code);
    expect((await getPoll(db, id, 'fw-sharer'))!.friends).toEqual({ agree: 0, disagree: 0 });
    await guessLeader(db, id, 'fw-sharer', 'skip');
    expect((await getPoll(db, id, 'fw-sharer'))!.friends).toEqual({ agree: 0, disagree: 1 });
  });

  it('one network clearing its cookies counts as one reporter', async () => {
    const id = await make({ title: 'Cookie clearer' });
    for (let k = 0; k < AUTO_HIDE_REPORTS + 1; k++) await reportPoll(db, id, `cc${k}`, 'spam', 'same-ip');
    expect(await getPoll(db, id, null)).not.toBeNull();
  });

  it('never saves a duel without its choices', async () => {
    const before = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.polls))[0].n;
    // A NUL byte that got past the checks: Postgres refuses the choice, and then the duel must not stay behind either.
    const bad = { ...createPollSchema.parse({ title: 'Broken', options: ['A', 'B'] }), options: ['A\u0000', 'B'] };
    await expect(createPoll(db, bad)).rejects.toThrow();
    expect((await db.select({ n: sql<number>`count(*)::int` }).from(schema.polls))[0].n).toBe(before);
  });

  it('ignores share codes with odd characters', async () => {
    const id = await make({ title: 'Odd code' });
    expect(await getPoll(db, id, null, 'a\u0000b')).not.toBeNull();
  });
});

describe('edge cases, round 2', () => {
  it('a guess with only your own vote in is not counted as right or wrong', async () => {
    const id = await make({ title: 'Lonely first vote', options: ['A', 'B'], hideUntilVoted: true });
    const [a] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'lonely');
    expect(await guessLeader(db, id, 'lonely', a.id)).toBe('ok');
    const p = (await getPoll(db, id, 'lonely'))!;
    expect(p.myGuess).toBeNull();
    expect(p.resultsVisible).toBe(true);
    expect((await getVoterStats(db, 'lonely')).guesses).toBe(0);
  });

  it('refuses look-alike choices ("Rahul" and "rahul.")', () => {
    expect(createPollSchema.safeParse({ title: 'Look alike', options: ['Rahul', 'rahul.'] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Emoji only', options: ['🔥', '❄️'] }).success).toBe(true);
  });
});

describe('edge cases, round 3', () => {
  it('the very first voter can still undo after the (skipped) exit poll', async () => {
    const id = await make({ title: 'First voter undo', options: ['A', 'B'], hideUntilVoted: true });
    const [a] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'first-undo');
    await guessLeader(db, id, 'first-undo', 'skip'); // only your own vote was there to see
    expect(await undoVote(db, id, 'first-undo')).toBe(true);
  });
});

describe('photos from the phone', () => {
  const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  it('saves a photo with the choice and holds the duel from public lists until reviewed', async () => {
    const id = await createPoll(db, createPollSchema.parse({ title: 'Photo duel', options: ['Mine', 'Yours'], photos: [jpeg, ''], photoConsent: true }));
    const p = (await getPoll(db, id, null))!;
    expect(p.options[0].imageUrl).toMatch(/^\/api\/img\/[\w-]{12}$/);
    expect(p.options[1].imageUrl).toBeNull();
    expect((await listPolls(db, 500)).some((x) => x.id === id)).toBe(false);
    await setPollFlags(db, id, { reviewed: true });
    expect((await listPolls(db, 500)).some((x) => x.id === id)).toBe(true);
    const [row] = await db.select().from(schema.photos).where(eq(schema.photos.pollId, id));
    expect(Buffer.from(row.data, 'base64')[0]).toBe(0xff);
  });
  it('needs the 18+ / permission tick for photos, and comes down at the first photo report', async () => {
    expect(createPollSchema.safeParse({ title: 'No tick', options: ['A', 'B'], photos: [jpeg, ''] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'No photos', options: ['A', 'B'], photos: ['', ''] }).success).toBe(true);
    const id = await createPoll(db, createPollSchema.parse({ title: 'Photo report', options: ['Mine', 'Yours'], photos: [jpeg, ''], photoConsent: true }));
    await setPollFlags(db, id, { reviewed: true });
    expect(await reportPoll(db, id, 'pr1', 'spam')).toEqual({ title: 'Photo report', hidden: false });
    expect(await reportPoll(db, id, 'pr2', 'me')).toEqual({ title: 'Photo report', hidden: true });
    expect(await getPoll(db, id, null)).toBeNull();
    const plain = await make({ title: 'No photo, me report' });
    expect(await reportPoll(db, plain, 'pr3', 'me')).toEqual({ title: 'No photo, me report', hidden: false });
  });
  it('refuses anything that is not a small JPEG', () => {
    expect(createPollSchema.safeParse({ title: 'Bad photo', options: ['A', 'B'], photos: ['data:image/png;base64,iVBORw0KGgo=', ''] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Fake photo', options: ['A', 'B'], photos: ['data:image/jpeg;base64,PHN2Zz4=', ''] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Huge photo', options: ['A', 'B'], photos: ['data:image/jpeg;base64,/9j/' + 'A'.repeat(200_000), ''] }).success).toBe(false);
  });
});

describe('election mode', () => {
  it('is off for everyday polls, on when chosen, and always on for politics', async () => {
    const plain = await make({ title: 'Mode off' });
    expect((await getPoll(db, plain, null))!.electionMode).toBe(false);
    const chosen = await make({ title: 'Mode on', electionMode: true });
    expect((await getPoll(db, chosen, null))!.electionMode).toBe(true);
    const politics = await make({ title: 'Modi or Kejriwal?' });
    expect((await getPoll(db, politics, null))!.electionMode).toBe(true);
  });
});

describe('rate it (1–5 faces)', () => {
  it('always gets the five faces, votes like a normal poll, and My votes shows the average', async () => {
    const id = await createPoll(db, createPollSchema.parse({ title: 'Rate the new song', kind: 'rating', options: ['x', 'y'] }));
    const p = (await getPoll(db, id, null))!;
    expect(p.kind).toBe('rating');
    expect(p.options.map((o) => o.label)).toEqual(['1', '2', '3', '4', '5']);
    expect(p.options.map((o) => o.emoji)).toEqual(['😖', '🙁', '😐', '🙂', '😍']);
    await castVote(db, id, p.options[4].id, 'r1');
    await castVote(db, id, p.options[3].id, 'r2');
    expect(await castVote(db, id, p.options[0].id, 'r1')).toBe('already_voted');
    expect((await getMyVotes(db, 'r1')).find((v) => v.pollId === id)?.standing).toEqual({ kind: 'guess' }); // hidden until the crowd guess
    await guessLeader(db, id, 'r1', 'skip');
    const [mine] = (await getMyVotes(db, 'r1')).filter((v) => v.pollId === id);
    expect(mine.pick).toBe('😍 5/5');
    expect(mine.standing).toEqual({ kind: 'rating', average: 4.5 });
    expect((await listPolls(db, 500)).find((x) => x.id === id)?.kind).toBe('rating');
  });
  it('averages to one decimal', async () => {
    const { ratingAverage } = await import('@/lib/rating');
    expect(ratingAverage([0, 0, 0, 0, 0])).toBeNull();
    expect(ratingAverage([1, 0, 0, 0, 2])).toBe(3.7);
  });
});

describe('pick several', () => {
  it('counts every tick, keeps one ballot per voter, and shows % of voters', async () => {
    const id = await make({ title: 'Which snacks?', options: ['Samosa', 'Momos', 'Dosa'], kind: 'multi' });
    const [a, b, c] = (await getPoll(db, id, null))!.options;
    expect(await castVote(db, id, a.id, 'm1', null, [b.id])).toBe('ok');
    expect(await castVote(db, id, b.id, 'm2', null, [c.id, b.id])).toBe('ok');
    expect(await castVote(db, id, c.id, 'm1', null, [])).toBe('already_voted');
    expect(await castVote(db, id, a.id, 'm3', null, ['not-an-option'])).toBe('bad_option');
    const p = (await getPoll(db, id, 'm1'))!;
    expect(p.kind).toBe('multi');
    expect(p.participants).toBe(2);
    expect(p.myPicks.sort()).toEqual([a.id, b.id].sort());
    expect(p.options.map((o) => o.votes)).toEqual([1, 2, 1]);
    expect(p.options.map((o) => Math.round(o.percent))).toEqual([50, 100, 50]);
    expect((await getMyVotes(db, 'm1')).find((v) => v.pollId === id)?.pick).toBe('Samosa, Momos');
    expect(await undoVote(db, id, 'm2')).toBe(true);
    expect((await getPoll(db, id, 'm1'))!.options.map((o) => o.votes)).toEqual([1, 1, 0]);
  });
});

describe('rank', () => {
  it('needs every choice placed, scores places with points, and shows the order in My votes', async () => {
    const id = await make({ title: 'Rank the captains', options: ['Dhoni', 'Kohli', 'Rohit'], kind: 'rank' });
    const [d, k, r] = (await getPoll(db, id, null))!.options;
    expect(await castVote(db, id, d.id, 'k1', null, [k.id])).toBe('bad_option'); // Rohit not placed
    expect(await castVote(db, id, d.id, 'k1', null, [k.id, r.id])).toBe('ok'); // D 2, K 1, R 0
    expect(await castVote(db, id, k.id, 'k2', null, [d.id, r.id])).toBe('ok'); // K 2, D 1, R 0
    expect(await castVote(db, id, d.id, 'k3', null, [r.id, k.id])).toBe('ok'); // D 2, R 1, K 0
    const p = (await getPoll(db, id, 'k1'))!;
    expect(p.kind).toBe('rank');
    expect(p.myPicks).toEqual([d.id, k.id, r.id]);
    expect(p.options.map((o) => o.votes)).toEqual([5, 3, 1]);
    expect(p.options.map((o) => Math.round(o.percent))).toEqual([83, 50, 17]);
    expect(p.options[0].avgPlace).toBe(1.3);
    expect((await getMyVotes(db, 'k1')).find((v) => v.pollId === id)).toMatchObject({ pick: '1. Dhoni, 2. Kohli, 3. Rohit', standing: { kind: 'leading', name: 'Dhoni', percent: 83 } });
  });
});

describe("today's question and trending", () => {
  it('the owner can make any visible poll today\'s question, and only one is', async () => {
    const id = await make({ title: 'Today pick test' });
    expect(await setToday(db, id)).toBe(true);
    expect(await getFeaturedId(db)).toBe(id);
    const other = await make({ title: 'Today pick two' });
    await setToday(db, other);
    const featured = await db.select({ id: schema.polls.id }).from(schema.polls).where(eq(schema.polls.featured, true));
    expect(featured.map((r) => r.id)).toEqual([other]);
    expect(await setToday(db, 'no-such-poll')).toBe(false);
  });
  it('trending ranks polls with recent votes, newest activity first', async () => {
    const { trendingPolls } = await import('@/lib/polls');
    const quiet = await make({ title: 'Quiet poll' });
    const busy = await make({ title: 'Busy poll' });
    const [o] = (await getPoll(db, busy, null))!.options;
    for (const v of ['t1', 't2', 't3']) await castVote(db, busy, o.id, v);
    const list = await trendingPolls(db, 50);
    expect(list.some((p) => p.id === busy)).toBe(true);
    expect(list.some((p) => p.id === quiet)).toBe(false);
  });
});

describe('story card friends line', () => {
  it('counts friends from a share link and how many agree, without saying who leads', async () => {
    const { friendsFromCode } = await import('@/lib/cards');
    const id = await make({ title: 'Friends line', options: ['A', 'B'] });
    const [a, b] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, a.id, 'host');
    const code = (await getPoll(db, id, 'host'))!.myShareCode!;
    await castVote(db, id, a.id, 'fr1', code);
    await castVote(db, id, b.id, 'fr2', code);
    expect(await friendsFromCode(db, id, code, a.id)).toEqual({ all: 2, agree: 1 });
    expect(await friendsFromCode(db, id, 'bad code', a.id)).toEqual({ all: 0, agree: 0 });
  });
});

describe('flood guard', () => {
  it('limits one network per poll, pauses a one-network flood, and the owner can resume', async () => {
    const { checkFlow, recordFlow, resumeVoting, NET_LIMIT, NET_LIMIT_POLITICS, SPIKE_MIN } = await import('@/lib/flood');
    const id = await make({ title: 'Flood check' });
    const p = (await getPoll(db, id, null))!;
    // Many people from many networks: never paused.
    for (let k = 0; k < SPIKE_MIN; k++) expect(await recordFlow(db, id, `net${k % 20}`, 'general')).toBe(false);
    expect(await checkFlow(db, id, 'net1', 'general')).toBe('ok');
    // A few networks send a flood (many votes each): the poll pauses, once.
    let paused = 0;
    for (let k = 0; k < SPIKE_MIN * 2; k++) if (await recordFlow(db, id, `bot-net${k % 3}`, 'general')) paused++;
    expect(paused).toBe(1);
    expect(NET_LIMIT).toBeGreaterThan(NET_LIMIT_POLITICS);
    expect(await checkFlow(db, id, 'someone-else', 'general')).toBe('frozen');
    expect(await castVote(db, id, p.options[0].id, 'flood-voter')).toBe('frozen');
    expect((await getPoll(db, id, null))!.pausedUntil).not.toBeNull();
    expect((await getReviewQueue(db))[0]).toMatchObject({ id, paused: true });
    expect(await resumeVoting(db, id)).toBe(true);
    expect(await checkFlow(db, id, 'bot-net0', 'general')).toBe('ok');
    expect(await castVote(db, id, p.options[0].id, 'flood-voter')).toBe('ok');
    expect((await getPoll(db, id, null))!.pausedUntil).toBeNull();
  });

  it('gives each network a soft limit per poll, tighter on politics', async () => {
    const { checkFlow, recordFlow, NET_LIMIT_POLITICS } = await import('@/lib/flood');
    const id = await make({ title: 'Network limit check', category: 'politics' });
    for (let k = 0; k < NET_LIMIT_POLITICS; k++) await recordFlow(db, id, 'college-wifi', 'politics');
    expect(await checkFlow(db, id, 'college-wifi', 'politics')).toBe('busy');
    expect(await checkFlow(db, id, 'college-wifi', 'general')).toBe('ok');
    expect(await checkFlow(db, id, 'home-wifi', 'politics')).toBe('ok');
  });
});

describe("today's set and sides", () => {
  it('says which side you are on, with "rare take" for small clubs, and never for a lone vote', async () => {
    const { sideOf, sideEmoji } = await import('@/lib/sides');
    const opts = (ps: number[]) => ps.map((percent) => ({ percent }));
    const poll = (ps: number[], totalVotes = 100) => ({ totalVotes, kind: 'choice' as const, options: opts(ps) as never });
    expect(sideOf(poll([63, 37]), { percent: 63 })).toEqual({ kind: 'crowd', pct: 63 });
    expect(sideOf(poll([63, 37]), { percent: 37 })).toEqual({ kind: 'minority', pct: 37 });
    expect(sideOf(poll([88, 12]), { percent: 12 })).toEqual({ kind: 'rare', oneIn: 8 });
    expect(sideOf(poll([51, 49]), { percent: 51 })).toEqual({ kind: 'neck' });
    expect(sideOf(poll([100], 1), { percent: 100 })).toEqual({ kind: 'first' });
    expect([sideEmoji({ kind: 'crowd', pct: 60 }), sideEmoji({ kind: 'rare', oneIn: 8 }), sideEmoji(null)]).toEqual(['🟩', '🟪', '⬜']);
  });

  it('is the same all day for everyone, today\'s question first, older polls only, and new tomorrow', async () => {
    const { getTodaySet, indiaDay, SET_SIZE } = await import('@/lib/polls');
    const old = [];
    for (let k = 0; k < 8; k++) old.push(await make({ title: `Old set poll ${k}`, category: ['food', 'tech', 'movies', 'cricket'][k % 4] }));
    await db.update(schema.polls).set({ createdAt: new Date(Date.now() - 3 * 86400_000) }).where(sql`${schema.polls.id} in (${sql.join(old.map((id) => sql`${id}`), sql`, `)})`);
    const today = await make({ title: 'Made today, not in the set' });
    const a = await getTodaySet(db, 'set-a');
    const b = await getTodaySet(db, 'set-b');
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    expect(a.length).toBe(SET_SIZE);
    expect(a[0].id).toBe(await getFeaturedId(db));
    expect(a.some((p) => p.id === today)).toBe(false);
    expect(new Set(a.map((p) => p.id)).size).toBe(a.length);
    expect(indiaDay(Date.UTC(2026, 9, 4, 19, 0)).label).toBe('2026-10-05'); // 00:30 in India
  });

  it('keeps one trending spot for a new poll once the shelf is full', async () => {
    const { trendingPolls } = await import('@/lib/polls');
    const hot = [];
    for (let k = 0; k < 3; k++) {
      const id = await make({ title: `Hot poll ${k}` });
      const p = (await getPoll(db, id, null))!;
      for (let v = 0; v < 3; v++) await castVote(db, id, p.options[0].id, `hot${k}-${v}`);
      hot.push(id);
    }
    const fresh = await make({ title: 'Brand new, no votes' });
    const shelf = await trendingPolls(db, 3);
    expect(shelf.length).toBe(3);
    expect(shelf[2].id).toBe(fresh);
  });
});

describe('final count for today\'s question', () => {
  it('closes at 9 pm India time when the owner ticks it, keeps an earlier end, and stays in the set once closed', async () => {
    const { nextFinalCount, getTodaySet } = await import('@/lib/polls');
    // 10:00 India time → 21:00 the same day; 22:00 → 21:00 the next day.
    expect(nextFinalCount(Date.parse('2026-10-04T10:00:00+05:30')).toISOString()).toBe(new Date('2026-10-04T21:00:00+05:30').toISOString());
    expect(nextFinalCount(Date.parse('2026-10-04T22:00:00+05:30')).toISOString()).toBe(new Date('2026-10-05T21:00:00+05:30').toISOString());
    const id = await make({ title: 'Final count check' });
    expect(await setToday(db, id, true)).toBe(true);
    expect((await getPoll(db, id, null))!.endsAt).toBe(nextFinalCount().toISOString());
    const soon = new Date(Date.now() + 10 * 60_000);
    const early = await make({ title: 'Ends earlier', endsAt: new Date(Date.now() + 3600_000).toISOString() });
    await db.update(schema.polls).set({ endsAt: soon }).where(eq(schema.polls.id, early));
    await setToday(db, early, true);
    expect((await getPoll(db, early, null))!.endsAt).toBe(soon.toISOString());
    const plain = await make({ title: 'No final count' });
    await setToday(db, plain, false);
    expect((await getPoll(db, plain, null))!.endsAt).toBeNull();
    // After the final count, today's question is still first in the set (closed), so evening visitors see the result.
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, plain));
    const set = await getTodaySet(db, null);
    expect(set[0]).toMatchObject({ id: plain, closed: true });
  });
});

describe('owner numbers', () => {
  it('counts returning voters (2+ India days in the last week), today, friends and politics, as totals only', async () => {
    const { getStats } = await import('@/lib/stats');
    const before = await getStats(db);
    const id = await make({ title: 'Stats check' });
    const id2 = await make({ title: 'Stats check two' });
    const [a] = (await getPoll(db, id, null))!.options;
    const [b] = (await getPoll(db, id2, null))!.options;
    await castVote(db, id, a.id, 'stats-back');
    await castVote(db, id2, b.id, 'stats-back');
    // Move one of the two votes to 2 days ago: this voter came back on another day.
    await db.update(schema.votes).set({ createdAt: new Date(Date.now() - 2 * 86400_000) }).where(sql`${schema.votes.voterKey} = 'stats-back' and ${schema.votes.pollId} = ${id}`);
    await castVote(db, id, a.id, 'stats-once');
    const after = await getStats(db);
    expect(after.weekReturning - before.weekReturning).toBe(1);
    expect(after.weekVoters - before.weekVoters).toBe(2);
    expect(after.newCameBack - before.newCameBack).toBe(1);
    expect(after.todayVotes - before.todayVotes).toBe(2);
  });
});

describe('planned days for today\'s question', () => {
  it('takes over on its day by itself, with the 9 pm count, and a pick by hand still wins', async () => {
    const { planToday, getPlannedToday, indiaDay, nextFinalCount } = await import('@/lib/polls');
    const today = indiaDay().label;
    const festival = await make({ title: 'Festival plan check' });
    const later = await make({ title: 'Later plan check' });
    expect(await planToday(db, festival, '2020-01-01')).toBe(false); // the past
    expect(await planToday(db, festival, 'next week')).toBe(false);
    expect(await planToday(db, later, '2099-11-08')).toBe(true);
    expect((await getPlannedToday(db)).map((p) => p.id)).toContain(later);
    expect(await getFeaturedId(db)).not.toBe(later);
    expect(await planToday(db, festival, today)).toBe(true);
    expect(await getFeaturedId(db)).toBe(festival);
    const f = (await getPoll(db, festival, null))!;
    expect(f.featured).toBe(true);
    expect(f.endsAt).toBe(nextFinalCount().toISOString());
    // The owner picks another one by hand today: it wins, and today's plan is cleared.
    const byHand = await make({ title: 'Picked by hand' });
    await setToday(db, byHand, false);
    expect(await getFeaturedId(db)).toBe(byHand);
    expect((await getPlannedToday(db)).some((p) => p.id === festival)).toBe(false);
    expect(await planToday(db, later, null)).toBe(true);
  });
});

describe('called it', () => {
  it('only the creator marks what happened; voting closes and each voter sees if they called it', async () => {
    const { setOutcome } = await import('@/lib/polls');
    const id = await createPoll(db, createPollSchema.parse({ title: 'Who wins tonight?', options: ['CSK', 'MI'], calledIt: true, hideUntilVoted: true }), 'creator-key');
    const p = (await getPoll(db, id, null))!;
    expect(p.calledIt).toBe(true);
    const [csk, mi] = p.options;
    await castVote(db, id, csk.id, 'fan1');
    await castVote(db, id, mi.id, 'fan2');
    await castVote(db, id, csk.id, 'fan3');
    // The vote is the prediction: no second "who's winning?" guess.
    expect((await getPoll(db, id, 'fan1'))!.needsGuess).toBe(false);
    expect(await setOutcome(db, id, csk.id, 'wrong-key')).toBe('not_allowed');
    expect(await setOutcome(db, id, 'nope', 'creator-key')).toBe('bad_option');
    expect(await setOutcome(db, id, mi.id, 'creator-key')).toBe('ok');
    expect(await setOutcome(db, id, csk.id, 'creator-key')).toBe('done'); // cannot be changed
    const after = (await getPoll(db, id, 'fan2'))!;
    expect(after.outcome).toBe(mi.id);
    expect(after.closed).toBe(true);
    expect(after.resultsVisible).toBe(true);
    expect(await castVote(db, id, csk.id, 'late')).toBe('closed');
    const mine = await getMyVotes(db, 'fan2');
    expect(mine.find((v) => v.pollId === id)?.standing).toEqual({ kind: 'called', name: 'MI', right: true });
    expect((await getMyVotes(db, 'fan1')).find((v) => v.pollId === id)?.standing).toEqual({ kind: 'called', name: 'MI', right: false });
  });
  it('is never on for politics or for other poll kinds', async () => {
    const politics = await createPoll(db, createPollSchema.parse({ title: 'Will Modi win?', options: ['Yes', 'No'], calledIt: true }), 'k');
    expect((await getPoll(db, politics, null))!.calledIt).toBe(false);
    const multi = await createPoll(db, createPollSchema.parse({ title: 'Which snacks?', options: ['Samosa', 'Chips'], kind: 'multi', calledIt: true }), 'k');
    expect((await getPoll(db, multi, null))!.calledIt).toBe(false);
  });
});

describe('packs', () => {
  it('makes its polls in order, finds them, and lists the pack for tonight', async () => {
    const { createPack, getPack, upcomingPacks } = await import('@/lib/packs');
    const start = new Date(Date.now() + 3 * 3_600_000).toISOString();
    const items = [
      createPollSchema.parse({ title: 'CSK vs MI: who wins?', options: ['CSK', 'MI'], calledIt: true, category: 'cricket', endsAt: start }),
      createPollSchema.parse({ title: 'How will it end?', options: ['Easy win', 'Close finish'], calledIt: true, endsAt: start }),
      createPollSchema.parse({ title: 'Where are you watching?', options: ['Phone', 'TV'] }),
    ];
    const { id, pollIds } = await createPack(db, { kind: 'match', title: 'CSK vs MI', startsAt: start }, items, 'pack-key');
    const pack = (await getPack(db, id, null))!;
    expect(pack.views.map((v) => v.id)).toEqual(pollIds);
    expect(pack.views[0].calledIt).toBe(true);
    expect((await upcomingPacks(db)).some((p) => p.id === id && p.polls === 3)).toBe(true);
    // One key marks every "Called it" in the pack.
    const { setOutcome } = await import('@/lib/polls');
    expect(await setOutcome(db, pollIds[1], pack.views[1].options[0].id, 'pack-key')).toBe('ok');
  });
});

describe('result alerts', () => {
  it('sends one alert per phone when results are in, then forgets the wants; gone phones are removed', async () => {
    const { wantResult, sendResultAlerts, duePolls } = await import('@/lib/push');
    const a = await make({ title: 'Alert poll A' });
    const b = await make({ title: 'Alert poll B' });
    const sub = (n: string) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'k', auth: 'a' } });
    await wantResult(db, 'phone1', sub('one'), a, 'en');
    await wantResult(db, 'phone1', sub('one'), b, 'en');
    await wantResult(db, 'phone2', sub('two'), a, 'hi');
    const sent: { endpoint: string; payload: string }[] = [];
    const n = await sendResultAlerts(db, [a, b], async (s, payload) => {
      sent.push({ endpoint: s.endpoint, payload });
      return { gone: s.endpoint.endsWith('two') };
    });
    expect(n).toBe(1);
    expect(sent).toHaveLength(2);
    const one = JSON.parse(sent.find((x) => x.endpoint.endsWith('one'))!.payload);
    expect(one.title).toBe('2 results are in');
    expect(JSON.parse(sent.find((x) => x.endpoint.endsWith('two'))!.payload).body).toContain('नतीजा');
    // Nothing left to send.
    expect(await sendResultAlerts(db, [a, b], async () => ({ gone: false }))).toBe(0);
    // Not due before the poll has ended.
    await wantResult(db, 'phone1', sub('one'), a, 'en');
    expect(await duePolls(db)).not.toContain(a);
  });
});

describe('group polls', () => {
  it('keep results closed for everyone until the whole group has voted, and stay off public lists', async () => {
    const id = await make({ title: 'Where do we eat Friday?', groupSize: 3, hideUntilVoted: false });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'g1');
    await castVote(db, id, p.options[1].id, 'g2');
    const waiting = (await getPoll(db, id, 'g1'))!;
    expect(waiting.groupWaiting).toBe(true);
    expect(waiting.resultsVisible).toBe(false);
    expect(waiting.totalVotes).toBe(0);
    expect(waiting.options.every((o) => o.votes === 0)).toBe(true);
    expect(waiting.participants).toBe(2); // the count is safe to show
    expect(await guessLeader(db, id, 'g1', p.options[0].id)).toBe('not_allowed');
    expect((await getMyVotes(db, 'g1')).find((v) => v.pollId === id)?.standing).toEqual({ kind: 'group', voted: 2, of: 3 });
    expect((await listPolls(db, 200)).some((x) => x.id === id)).toBe(false);
    await castVote(db, id, p.options[0].id, 'g3');
    const open = (await getPoll(db, id, 'g1'))!;
    expect(open.groupWaiting).toBe(false);
    expect(open.resultsVisible).toBe(true);
    expect(open.totalVotes).toBe(3);
  });
});

describe('no crowd guess on group or called-it polls', () => {
  it('shows results straight away once open, and My votes never asks for a guess', async () => {
    const g = await make({ title: 'Group of two', groupSize: 2, hideUntilVoted: true });
    const c = await make({ title: 'Who wins tomorrow?', calledIt: true, hideUntilVoted: true, options: ['A', 'B'] });
    for (const id of [g, c]) {
      const p = (await getPoll(db, id, null))!;
      await castVote(db, id, p.options[0].id, 'ng1');
      await castVote(db, id, p.options[1].id, 'ng2');
      const v = (await getPoll(db, id, 'ng1'))!;
      expect(v.needsGuess).toBe(false);
      expect(v.resultsVisible).toBe(true);
      expect((await getMyVotes(db, 'ng1')).find((x) => x.pollId === id)?.standing.kind).not.toBe('guess');
    }
  });
});

describe('month in opinions', () => {
  it('describes this month from visible results only, leaves out politics, and never counts hidden numbers', async () => {
    const { getMonth } = await import('@/lib/month');
    const ids = [];
    for (const n of [0, 1, 2, 3]) {
      const id = await make({ title: `Month poll ${n}`, category: 'food' });
      const p = (await getPoll(db, id, null))!;
      // Four others pick Virat; "me" picks Virat on 0 and 1, Dhoni on 2 and 3 (a rare take needs 5+ voters).
      for (const k of [1, 2, 3, 4]) await castVote(db, id, p.options[0].id, `mo${n}-${k}`);
      await castVote(db, id, p.options[n < 2 ? 0 : 2].id, 'month-me');
      ids.push(id);
    }
    // A hidden-results poll I have not guessed on: it must not count.
    const hidden = await make({ title: 'Hidden one', hideUntilVoted: true });
    const h = (await getPoll(db, hidden, null))!;
    for (const k of [1, 2, 3]) await castVote(db, hidden, h.options[0].id, `mh-${k}`);
    await castVote(db, hidden, h.options[0].id, 'month-me');
    const politics = await make({ title: 'Will Modi win?' });
    const pp = (await getPoll(db, politics, null))!;
    await castVote(db, politics, pp.options[0].id, 'month-me');
    const m = (await getMonth(db, 'month-me'))!;
    expect(m.polls).toBe(5); // 4 food + the hidden one; politics left out
    expect(m.judged).toBe(4);
    expect(m.withCrowd).toBe(2);
    expect(m.grid).toBe('🟩🟩🟪🟪');
    expect(m.type).toBe('mix');
    expect(m.rarest).toEqual({ title: 'Month poll 2', pick: 'Dhoni', pct: 20 });
    expect(m.topCategory).toBe('food');
  });
});

describe('owner-deleted polls', () => {
  it('are deleted once with their votes', async () => {
    const { deleteOwnerRemoved } = await import('@/db/retire');
    await db.insert(schema.polls).values({ id: 'fxt5mpm3', title: 'To be deleted' });
    await db.insert(schema.options).values([{ id: 'fx-a', pollId: 'fxt5mpm3', label: 'A', position: 0 }, { id: 'fx-b', pollId: 'fxt5mpm3', label: 'B', position: 1 }]);
    await castVote(db, 'fxt5mpm3', 'fx-a', 'del1');
    await db.execute(sql`delete from app_migrations where name = 'delete-poll-fxt5mpm3'`);
    await deleteOwnerRemoved(db);
    expect(await getPoll(db, 'fxt5mpm3', null, null, { includeHidden: true })).toBeNull();
    expect(await db.select().from(schema.votes).where(eq(schema.votes.pollId, 'fxt5mpm3'))).toEqual([]);
  });
});

describe('abusive emoji', () => {
  it('refuses 🖕 in the question, a choice or a choice picture, in any skin tone', () => {
    expect(hasBlockedWord('Who wins 🖕')).toBe(true);
    expect(hasBlockedWord('🖕🏽')).toBe(true);
    expect(hasBlockedWord('Chai or coffee? ☕')).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Gunda vs Bhatiya', options: ['Gunda', 'Bhatiya'], emojis: ['💪', '🖕'] }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Tea or coffee', options: ['Tea', 'Coffee 🖕'] }).success).toBe(false);
  });
});

describe('profiles', () => {
  it('cleans names: 2 to 30 letters, no abuse', async () => {
    const { cleanName } = await import('@/lib/profiles');
    expect(cleanName('  Lokesh  ')).toBe('Lokesh');
    expect(cleanName('L')).toBeNull();
    expect(cleanName('x'.repeat(50))).toHaveLength(30);
    expect(cleanName(undefined)).toBeNull();
  });

  it('keeps who made a poll, claims phone polls only with their key, and never touches votes', async () => {
    const { createUser, claimPolls, pollsByOwner, deleteProfile } = await import('@/lib/profiles');
    const uid = 'user-' + Math.random().toString(36).slice(2, 8);
    await createUser(db, { id: uid, name: 'Asha', avatar: '🦁' }, { id: 'cred-' + uid, publicKey: 'pk', counter: 0, transports: ['internal'] });
    const owned = await createPoll(db, createPollSchema.parse({ title: 'Owned poll', options: ['A', 'B'] }), 'k-owned', undefined, uid);
    const phone = await createPoll(db, createPollSchema.parse({ title: 'Phone poll', options: ['A', 'B'] }), 'k-phone');
    const p = (await getPoll(db, phone, null))!;
    await castVote(db, phone, p.options[0].id, 'voter-asha');
    // A wrong key claims nothing; the right one joins the profile once.
    expect(await claimPolls(db, uid, [{ id: phone, key: 'wrong' }])).toBe(0);
    expect(await claimPolls(db, uid, [{ id: phone, key: 'k-phone' }])).toBe(1);
    expect(await claimPolls(db, 'someone-else', [{ id: phone, key: 'k-phone' }])).toBe(0);
    const mine = await pollsByOwner(db, uid);
    expect(mine.map((x) => x.id).sort()).toEqual([owned, phone].sort());
    expect(mine.find((x) => x.id === phone)?.votes).toBe(1);
    // Deleting the profile keeps the polls (with no owner) and their votes.
    await deleteProfile(db, uid);
    expect(await pollsByOwner(db, uid)).toEqual([]);
    const [row] = await db.select({ ownerId: schema.polls.ownerId }).from(schema.polls).where(eq(schema.polls.id, owned));
    expect(row.ownerId).toBeNull();
    expect((await getPoll(db, phone, 'voter-asha'))!.participants).toBe(1);
    expect(await db.select().from(schema.passkeys).where(eq(schema.passkeys.userId, uid))).toEqual([]);
  });
});
