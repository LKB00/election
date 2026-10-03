import { beforeAll, describe, expect, it } from 'vitest';
import {
  AUTO_HIDE_REPORTS, castVote, createPoll, deleteVoterData, getDeck, getFeaturedId, getMyVotes, getPoll, getReviewQueue, getVoterStats, guessLeader, listPolls,
  reportPoll, setPollFlags, setReason, toggleReaction, undoVote,
} from '@/lib/polls';
import { hasBlockedWord, namesPolitics } from '@/lib/moderation';
import { activeSilence } from '@/lib/silence';
import { createPollSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { schema, type Db } from '@/db';
import { eq, sql } from 'drizzle-orm';

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

  it('never auto-hides a reviewed duel (people cannot report the flagship away)', async () => {
    for (let k = 0; k < AUTO_HIDE_REPORTS + 2; k++) await reportPoll(db, 'modi-vs-rahul', `mass${k}`, 'false');
    expect(await getPoll(db, 'modi-vs-rahul', null)).not.toBeNull();
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

describe('starter duels', () => {
  it('are seeded once, reviewed, and listed', async () => {
    const list = await listPolls(db, 500, { reviewedOnly: true });
    expect(list.map((p) => p.id)).toEqual(expect.arrayContaining(['virat-rohit-dhoni', 'ipl-2027-winner', 'up-2027', 'chai-or-coffee']));
    expect(list.find((p) => p.id === 'ipl-2027-winner')!.options).toHaveLength(10);
    await (await import('@/db/seed')).seedFlagship(db);
    expect((await getPoll(db, 'chai-or-coffee', null))!.options).toHaveLength(2);
  });
});
