import { beforeAll, describe, expect, it } from 'vitest';
import { castVote, createPoll, getDeck, getFeaturedId, getPoll, getVoterStats, guessLeader, listPolls, setReason, toggleReaction, undoVote } from '@/lib/polls';
import { createPollSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import type { Db } from '@/db';

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
});

describe('flagship poll and reasons', () => {
  it('is seeded once and kept out of the normal list', async () => {
    const id = await getFeaturedId(db);
    expect(id).toBe('modi-vs-rahul');
    const poll = (await getPoll(db, id!, null))!;
    expect(poll.options.map((o) => o.label)).toEqual(['Narendra Modi', 'Rahul Gandhi']);
    expect(poll.hideUntilVoted).toBe(true);
    expect(poll.options.map((o) => o.subtitle)).toEqual(['BJP', 'INC']);
    expect((await listPolls(db, 100)).some((p) => p.id === id)).toBe(false);
    await (await import('@/db/seed')).seedFlagship(db); // running again changes nothing
    expect((await getPoll(db, id!, null))!.options).toHaveLength(2);
  });

  it('saves a reason only for allowed answers and only after voting', async () => {
    const id = 'modi-vs-rahul';
    expect(await setReason(db, id, 'nobody', 'Leadership')).toBe(false); // has not voted
    await castVote(db, id, 'modi', 'r1');
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
    const deck = await getDeck(db, null);
    expect(deck[0].id).toBe('modi-vs-rahul');
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
  it('blocks after the limit', () => {
    expect([1, 2, 3].map(() => rateLimit('t', 2, 1000))).toEqual([true, true, false]);
  });
});
