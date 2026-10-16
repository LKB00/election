import { beforeAll, describe, expect, it } from 'vitest';
import {
  AUTO_HIDE_REPORTS, castVote, createPoll, deleteVoterData, getDeck, getMyVotes, getPoll, getReviewQueue, getVoterStats, guessLeader, listPolls,
  GROUP_MIN, groupSplit, reportPoll, setPollFlags, setReason, toggleReaction, undoVote, voteTotals, voterCount,
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
    // The live counts lists ask for give the same number, and nothing for hidden polls or unknown ids.
    expect(await voteTotals(db, [id, 'no-such-poll'])).toEqual({ [id]: 2 });
    await setPollFlags(db, id, { hidden: true });
    expect(await voteTotals(db, [id])).toEqual({});
    await setPollFlags(db, id, { hidden: false });
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

  it('keeps one reaction each, only for voters and only allowed emoji', async () => {
    const id = await make({ title: 'Reactions' });
    const p = (await getPoll(db, id, null))!;
    expect(await toggleReaction(db, id, 'x1', '🔥')).toBe(false); // has not voted
    await castVote(db, id, p.options[0].id, 'x1');
    expect(await toggleReaction(db, id, 'x1', '💩')).toBe(false);
    expect(await toggleReaction(db, id, 'x1', '🔥')).toBe(true);
    let v = (await getPoll(db, id, 'x1'))!;
    expect(v.reactions.find((r) => r.emoji === '🔥')!.n).toBe(1);
    expect(v.myReactions).toEqual(['🔥']);
    // One reaction each: another emoji replaces it.
    expect(await toggleReaction(db, id, 'x1', '😂')).toBe(true);
    v = (await getPoll(db, id, 'x1'))!;
    expect(v.myReactions).toEqual(['😂']);
    expect(v.reactions.find((r) => r.emoji === '🔥')!.n).toBe(0);
    expect(v.reactions.find((r) => r.emoji === '😂')!.n).toBe(1);
    await toggleReaction(db, id, 'x1', '😂'); // tap again removes it
    v = (await getPoll(db, id, 'x1'))!;
    expect(v.reactions.find((r) => r.emoji === '😂')!.n).toBe(0);
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

  it('starts with the newest poll (no poll is picked by the owner)', async () => {
    const pick = await make({ title: 'Newest first check' });
    const deck = await getDeck(db, null);
    expect(deck[0].id).toBe(pick);
    expect(deck.length).toBeGreaterThan(1);
  });

  it('offers next only polls you have not voted in, your topics first', async () => {
    const food = await make({ title: 'Next: food one', category: 'food' });
    const food2 = await make({ title: 'Next: food two', category: 'food' });
    const tech = await make({ title: 'Next: tech one', category: 'tech' });
    const newest = await make({ title: 'Next: newest general' });
    const p = (await getPoll(db, food, null))!;
    await castVote(db, food, p.options[0].id, 'nx1');
    const deck = await getDeck(db, 'nx1', 40);
    expect(deck.some((d) => d.id === food)).toBe(false); // voted: never offered again
    expect(deck[0].id).toBe(food2); // the topic you vote in comes first
    // A followed topic beats it; the poll on screen is skipped.
    const followed = await getDeck(db, 'nx1', 40, { followed: ['tech'], exclude: [newest] });
    expect(followed[0].id).toBe(tech);
    expect(followed.some((d) => d.id === newest)).toBe(false);
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

  it('treats a poll naming a politician as politics, and lists it at once (no approval step)', async () => {
    expect(namesPolitics('Modi or Kejriwal?')).toBe(true);
    expect(namesPolitics('Aap kise chunoge?', 'Shahrukh')).toBe(false);
    const id = await make({ title: 'Kejriwal or Yogi?', options: ['Kejriwal', 'Yogi'], category: 'food' });
    expect((await getPoll(db, id, null))!.category).toBe('politics');
    expect((await listPolls(db, 500)).some((p) => p.id === id)).toBe(true);
    expect((await listPolls(db, 500, { category: 'politics' })).some((p) => p.id === id)).toBe(true);
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
    // Hindi: one whole first letter with its vowel sign, not two initials that read as another word.
    expect(faceLabels(['पुष्पा तीन', 'जवान'])).toEqual(['पु', 'ज']);
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
  it('saves a photo with the choice and lists the poll at once', async () => {
    const id = await createPoll(db, createPollSchema.parse({ title: 'Photo duel', options: ['Mine', 'Yours'], photos: [jpeg, ''], photoConsent: true }));
    const p = (await getPoll(db, id, null))!;
    expect(p.options[0].imageUrl).toMatch(/^\/api\/img\/[\w-]{12}$/);
    expect(p.options[1].imageUrl).toBeNull();
    expect((await listPolls(db, 500)).some((x) => x.id === id)).toBe(true);
    const [row] = await db.select().from(schema.photos).where(eq(schema.photos.pollId, id));
    expect(Buffer.from(row.data, 'base64')[0]).toBe(0xff);
  });
  it('takes photos without a tick (the Rules say who may add them), and comes down at the first photo report', async () => {
    expect(createPollSchema.safeParse({ title: 'No tick', options: ['A', 'B'], photos: [jpeg, ''] }).success).toBe(true);
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

describe('trending', () => {
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

describe('9 pm final count', () => {
  it('is 9 pm India time tonight, or tomorrow once it is past', async () => {
    const { nextFinalCount } = await import('@/lib/polls');
    // 10:00 India time → 21:00 the same day; 22:00 → 21:00 the next day.
    expect(nextFinalCount(Date.parse('2026-10-04T10:00:00+05:30')).toISOString()).toBe(new Date('2026-10-04T21:00:00+05:30').toISOString());
    expect(nextFinalCount(Date.parse('2026-10-04T22:00:00+05:30')).toISOString()).toBe(new Date('2026-10-05T21:00:00+05:30').toISOString());
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
    expect(await setOutcome(db, id, csk.id, 'creator-key')).toBe('taken'); // cannot be changed
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

describe('poll maker tools', () => {
  const owner = async () => {
    const { createUser } = await import('@/lib/profiles');
    const uid = 'mk-' + Math.random().toString(36).slice(2, 8);
    await createUser(db, { id: uid, name: 'Maker', avatar: '🦁' }, { id: 'cred-' + uid, publicKey: 'pk', counter: 0, transports: [] });
    return uid;
  };

  it('fixes a typo only before the first vote, and only for the maker', async () => {
    const { editPoll } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Chai or cofee?', options: ['Chai', 'Cofee'] }), 'k', undefined, uid);
    const p = (await getPoll(db, id, null))!;
    const opts = p.options.map((o) => ({ id: o.id, label: o.label === 'Cofee' ? 'Coffee' : o.label }));
    expect(await editPoll(db, id, 'someone-else', { title: 'x', description: '', options: [] })).toBe('not_found');
    expect(await editPoll(db, id, uid, { title: 'Chai or coffee?', description: '', options: opts })).toBe('ok');
    expect((await getPoll(db, id, null))!.options.map((o) => o.label)).toEqual(['Chai', 'Coffee']);
    await castVote(db, id, p.options[0].id, 'v-typo');
    expect(await editPoll(db, id, uid, { title: 'Changed', description: '', options: opts })).toBe('voted');
    expect((await getPoll(db, id, null))!.title).toBe('Chai or coffee?');
  });

  it('ends a poll now (final), counts where votes came from, and shows the last result on "ask again"', async () => {
    const { setEnd, countSource, makerView } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Best snack?', options: ['Samosa', 'Vada pav'], hideUntilVoted: true }), 'k', undefined, uid);
    const p = (await getPoll(db, id, null))!;
    for (const [k, n] of [0, 0, 1].entries()) await castVote(db, id, p.options[n].id, `src-${k}`);
    await countSource(db, id, 'wa');
    await countSource(db, id, 'wa');
    await countSource(db, id, 'qr');
    let v = (await makerView(db, id, uid))!;
    expect(v.votes).toBe(3);
    expect(v.sources).toEqual([{ src: 'wa', n: 2 }, { src: 'qr', n: 1 }]);
    expect(v.byHour.reduce((a, b) => a + b, 0)).toBe(3);
    // Hidden results: no results picture until the poll ends.
    expect(v.resultsPublic).toBe(false);
    expect(await setEnd(db, id, uid, new Date())).toBe('ok');
    v = (await makerView(db, id, uid))!;
    expect(v.closed && v.resultsPublic).toBe(true);
    expect(await setEnd(db, id, uid, new Date(Date.now() + 3_600_000))).toBe('closed');
    const again = await createPoll(db, createPollSchema.parse({ title: 'Best snack?', options: ['Samosa', 'Vada pav'], previousId: id }), 'k2', undefined, uid);
    const view = (await getPoll(db, again, null))!;
    expect(view.previous).toMatchObject({ id, leader: 'Samosa', percent: 67, voters: 3 });
  });

  it('keeps "last time" quiet while the earlier result is still hidden', async () => {
    const uid = await owner();
    const first = await createPoll(db, createPollSchema.parse({ title: 'Hidden then?', options: ['A', 'B'], hideUntilVoted: true }), 'k', undefined, uid);
    const p = (await getPoll(db, first, null))!;
    await castVote(db, first, p.options[0].id, 'hid-1');
    const again = await createPoll(db, createPollSchema.parse({ title: 'Hidden then?', options: ['A', 'B'], previousId: first }), 'k', undefined, uid);
    expect((await getPoll(db, again, null))!.previous).toMatchObject({ leader: null, percent: null, voters: 1 });
  });

  it('suggested choices wait for the maker; the same suggestion counts up; adding makes it a real choice', async () => {
    const { suggest, decideSuggestion, makerView } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Best chaat?', options: ['Golgappe', 'Papdi'], suggestionsOn: true }), 'k', undefined, uid);
    expect(await suggest(db, id, 'golgappe')).toBe('exists');
    expect(await suggest(db, id, 'Aloo tikki')).toBe('ok');
    expect(await suggest(db, id, 'aloo  tikki')).toBe('ok');
    expect((await getPoll(db, id, null))!.options).toHaveLength(2);
    const v = (await makerView(db, id, uid))!;
    expect(v.pending).toEqual([expect.objectContaining({ label: 'Aloo tikki', n: 2 })]);
    expect(await decideSuggestion(db, id, 'not-me', v.pending[0].id, true)).toBe('not_found');
    expect(await decideSuggestion(db, id, uid, v.pending[0].id, true)).toBe('ok');
    expect((await getPoll(db, id, null))!.options.map((o) => o.label)).toEqual(['Golgappe', 'Papdi', 'Aloo tikki']);
    const off = await createPoll(db, createPollSchema.parse({ title: 'No ideas please', options: ['A', 'B'] }), 'k', undefined, uid);
    expect(await suggest(db, off, 'C')).toBe('off');
  });

  it('"which dates work?" counts yes and "if need be" separately', async () => {
    const id = await createPoll(db, createPollSchema.parse({ title: 'Goa weekend?', kind: 'dates', options: ['Sat, 7 Nov', 'Sat, 14 Nov', 'Sat, 21 Nov'], hideUntilVoted: false }));
    const [a, b, c] = (await getPoll(db, id, null))!.options.map((o) => o.id);
    expect(await castVote(db, id, a, 'd1', null, [b], [])).toBe('ok');
    expect(await castVote(db, id, a, 'd2', null, [], [b, c])).toBe('ok');
    expect(await castVote(db, id, c, 'd3', null, [], [c])).toBe('ok');
    const p = (await getPoll(db, id, 'd2'))!;
    const by = Object.fromEntries(p.options.map((o) => [o.label, [o.votes, o.maybe]]));
    expect(by).toEqual({ 'Sat, 7 Nov': [2, 0], 'Sat, 14 Nov': [1, 1], 'Sat, 21 Nov': [0, 2] });
    expect(p.myPicks).toEqual([a]);
    expect(p.myMaybes.sort()).toEqual([b, c].sort());
    expect(p.needsGuess).toBe(false);
  });

  it('shuffles the order per voter (the same every visit), never for the EVM', async () => {
    const id = await createPoll(db, createPollSchema.parse({ title: 'Order test', options: ['A', 'B', 'C', 'D', 'E', 'F'], shuffle: true }));
    const order = async (v: string) => (await getPoll(db, id, v))!.options.map((o) => o.label).join('');
    expect(await order('x1')).toBe(await order('x1'));
    const seen = new Set(await Promise.all(['x1', 'x2', 'x3', 'x4', 'x5', 'x6'].map(order)));
    expect(seen.size).toBeGreaterThan(1);
    expect((await getPoll(db, id, null))!.options.map((o) => o.label).join('')).toBe('ABCDEF');
    const evm = await createPoll(db, createPollSchema.parse({ title: 'Ballot order', options: ['A', 'B', 'C', 'D'], shuffle: true, electionMode: true }));
    expect((await getPoll(db, evm, 'x2'))!.options.map((o) => o.label).join('')).toBe('ABCD');
  });

  it('shows the maker only when they chose to', async () => {
    const uid = await owner();
    const shown = await createPoll(db, createPollSchema.parse({ title: 'Named poll', options: ['A', 'B'], showMaker: true }), 'k', undefined, uid);
    const quiet = await createPoll(db, createPollSchema.parse({ title: 'Quiet poll', options: ['A', 'B'] }), 'k', undefined, uid);
    expect((await getPoll(db, shown, null))!.maker).toMatchObject({ id: uid, name: 'Maker' });
    expect((await getPoll(db, quiet, null))!.maker).toBeNull();
  });
});

describe('edge cases, round 4 (server review)', () => {
  const owner = async () => {
    const { createUser } = await import('@/lib/profiles');
    const uid = 'r4-' + Math.random().toString(36).slice(2, 8);
    await createUser(db, { id: uid, name: 'Maker', avatar: '🦁' }, { id: 'cred-' + uid, publicKey: 'pk', counter: 0, transports: [] });
    return uid;
  };

  it('a typo fix or an added choice that names a party makes it a politics poll', async () => {
    const { editPoll, suggest, decideSuggestion, makerView } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Tea or coffee?', options: ['Tea', 'Coffee'] }), 'k', undefined, uid);
    const opts = (await getPoll(db, id, null))!.options.map((o) => ({ id: o.id, label: o.label }));
    expect(await editPoll(db, id, uid, { title: 'BJP or Congress?', description: '', options: opts })).toBe('ok');
    const [row] = await db.select().from(schema.polls).where(eq(schema.polls.id, id));
    expect([row.category, row.reviewed]).toEqual(['politics', false]);
    const other = await createPoll(db, createPollSchema.parse({ title: 'Best leader?', options: ['A', 'B'], suggestionsOn: true }), 'k', undefined, uid);
    expect(await suggest(db, other, 'Kejriwal')).toBe('ok');
    const sid = (await makerView(db, other, uid))!.pending[0].id;
    expect(await decideSuggestion(db, other, uid, sid, true)).toBe('ok');
    expect((await db.select().from(schema.polls).where(eq(schema.polls.id, other)))[0].category).toBe('politics');
  });

  it('a typo fix cannot make two choices the same', async () => {
    const { editPoll } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Pick one', options: ['Alpha', 'Beta', 'Gamma'] }), 'k', undefined, uid);
    const [a] = (await getPoll(db, id, null))!.options;
    expect(await editPoll(db, id, uid, { title: 'Pick one', description: '', options: [{ id: a.id, label: 'beta' }] })).toBe('same');
  });

  it('a marked answer is final: the same tap again is fine, a different one is refused', async () => {
    const { markOutcome } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Who wins the final?', options: ['CSK', 'MI'], calledIt: true }), 'k', undefined, uid);
    const [a, b] = (await getPoll(db, id, null))!.options;
    expect(await markOutcome(db, id, uid, a.id)).toBe('ok');
    expect(await markOutcome(db, id, uid, a.id)).toBe('done');
    expect(await markOutcome(db, id, uid, b.id)).toBe('taken');
  });

  it('no undo once hidden results were shown straight after the vote', async () => {
    const called = await createPoll(db, createPollSchema.parse({ title: 'Who wins the toss?', options: ['CSK', 'MI'], calledIt: true, hideUntilVoted: true }));
    const [c] = (await getPoll(db, called, null))!.options;
    await castVote(db, called, c.id, 'r4-called');
    expect(await undoVote(db, called, 'r4-called')).toBe(false);
    const group = await make({ title: 'Our trio', groupSize: 3, hideUntilVoted: true });
    const [g] = (await getPoll(db, group, null))!.options;
    await castVote(db, group, g.id, 'r4-g1');
    expect(await undoVote(db, group, 'r4-g1')).toBe(true); // nothing seen yet: the group is still voting
    for (const v of ['r4-g1', 'r4-g2', 'r4-g3']) await castVote(db, group, g.id, v);
    expect(await undoVote(db, group, 'r4-g3')).toBe(false); // the last vote opened the results
  });

  it('dates polls: no crowd guess anywhere, and "if need be" is not a yes on My votes', async () => {
    const id = await createPoll(db, createPollSchema.parse({ title: 'Trip dates?', kind: 'dates', options: ['Sat, 7 Nov', 'Sat, 14 Nov'], hideUntilVoted: true }));
    const [a, b] = (await getPoll(db, id, null))!.options.map((o) => o.id);
    await castVote(db, id, a, 'r4-d1', null, [], [b]);
    await castVote(db, id, a, 'r4-d2', null, [], [b]);
    await castVote(db, id, b, 'r4-d3', null, [], []);
    expect(await guessLeader(db, id, 'r4-d1', a)).toBe('not_allowed');
    const [mine] = await getMyVotes(db, 'r4-d1');
    expect(mine.standing).toMatchObject({ kind: 'leading', name: 'Sat, 7 Nov' });
    expect((await listPolls(db, 50)).find((p) => p.id === id)?.kind).toBe('dates');
  });

  it('two quick "Add" taps cannot pass the choice limit', async () => {
    const { suggest, decideSuggestion, makerView } = await import('@/lib/maker');
    const uid = await owner();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Nine choices', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], suggestionsOn: true }), 'k', undefined, uid);
    await suggest(db, id, 'Ten');
    await suggest(db, id, 'Eleven');
    const [x, y] = (await makerView(db, id, uid))!.pending.map((s) => s.id);
    const r = await Promise.all([decideSuggestion(db, id, uid, x, true), decideSuggestion(db, id, uid, y, true)]);
    expect(r.sort()).toEqual(['full', 'ok']);
    expect((await getPoll(db, id, null))!.options).toHaveLength(10);
  });

  it('a suggestion on an ended poll says it ended; one on a poll without suggestions says so', async () => {
    const { suggest } = await import('@/lib/maker');
    const ended = await createPoll(db, createPollSchema.parse({ title: 'Ended poll', options: ['A', 'B'], suggestionsOn: true }));
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, ended));
    expect(await suggest(db, ended, 'C')).toBe('closed');
  });

  it('whole percentages add up to 100', async () => {
    const { wholePercents } = await import('@/lib/percent');
    expect(wholePercents([100 / 3, 100 / 3, 100 / 3])).toEqual([34, 33, 33]);
    expect(wholePercents([0, 0])).toEqual([0, 0]);
  });
});

describe('the maker deletes a poll', () => {
  it('takes it down for everyone at once, for good, and erases it after the kept days', async () => {
    const { deletePoll, purgeDeleted } = await import('@/lib/maker');
    const { createUser, pollsByOwner } = await import('@/lib/profiles');
    const { DELETED_KEEP_DAYS } = await import('@/lib/limits');
    const uid = 'del-' + Math.random().toString(36).slice(2, 8);
    await createUser(db, { id: uid, name: 'Maker', avatar: '🦁' }, { id: 'cred-' + uid, publicKey: 'pk', counter: 0, transports: [] });
    const id = await createPoll(db, createPollSchema.parse({ title: 'Delete me?', options: ['Yes', 'No'] }), 'k', undefined, uid);
    const [o] = (await getPoll(db, id, null))!.options;
    await castVote(db, id, o.id, 'del-voter');
    expect(await deletePoll(db, id, 'someone-else')).toBe('not_found');
    expect(await deletePoll(db, id, uid)).toBe('ok');
    expect(await getPoll(db, id, 'del-voter')).toBeNull();
    expect((await pollsByOwner(db, uid)).map((p) => p.id)).not.toContain(id);
    expect((await getMyVotes(db, 'del-voter')).map((v) => v.pollId)).not.toContain(id);
    // The owner's "Show again" cannot bring it back.
    expect(await setPollFlags(db, id, { hidden: false })).toBe(false);
    expect(await getPoll(db, id, null)).toBeNull();
    // Kept (hidden) until the days are up, then erased with its votes.
    expect(await purgeDeleted(db)).toBe(0);
    expect(await purgeDeleted(db, Date.now() + (DELETED_KEEP_DAYS + 1) * 86_400_000)).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(schema.polls).where(eq(schema.polls.id, id))).toHaveLength(0);
    expect(await db.select().from(schema.votes).where(eq(schema.votes.pollId, id))).toHaveLength(0);
  });
});

describe('"Other (write your own)"', () => {
  it('adds one Other choice at the end, needs a clean name, and shows names written by 2+ people', async () => {
    const id = await make({ allowOther: true });
    const p = (await getPoll(db, id, null))!;
    const other = p.options.at(-1)!;
    expect(p.options.length).toBe(4);
    expect(other.isOther).toBe(true);
    expect(p.options.filter((o) => o.isOther).length).toBe(1);
    // No name, too long, or an abusive word: refused. A normal choice keeps no text.
    expect(await castVote(db, id, other.id, 'o0', null, [], [], '   ')).toBe('bad_other');
    expect(await castVote(db, id, other.id, 'o0', null, [], [], 'x'.repeat(41))).toBe('bad_other');
    expect(await castVote(db, id, other.id, 'o0', null, [], [], 'chutiya')).toBe('bad_other');
    expect(await castVote(db, id, p.options[0].id, 'o1', null, [], [], 'ignored')).toBe('ok');
    expect((await getPoll(db, id, 'o1'))!.myOther).toBeNull();
    // Same name, typed differently, counts together; a name only one person wrote never shows.
    expect(await castVote(db, id, other.id, 'o2', null, [], [], 'Yogi Adityanath')).toBe('ok');
    expect(await castVote(db, id, other.id, 'o3', null, [], [], '  yogi   adityanath ')).toBe('ok');
    expect(await castVote(db, id, other.id, 'o4', null, [], [], 'Yogi Adityanath')).toBe('ok');
    expect(await castVote(db, id, other.id, 'o5', null, [], [], 'Someone Once')).toBe('ok');
    const v = (await getPoll(db, id, 'o2'))!;
    expect(v.myOther).toBe('Yogi Adityanath');
    expect(v.otherTop).toEqual([{ name: 'Yogi Adityanath', n: 3 }]);
    expect(v.options.at(-1)!.votes).toBe(4);
    // My votes shows what you wrote, not "Other".
    expect((await getMyVotes(db, 'o2')).find((m) => m.pollId === id)!.pick).toBe('Yogi Adityanath');
  });

  it('keeps written names hidden while results are hidden, and is off for other poll kinds and Called it', async () => {
    const id = await make({ allowOther: true, hideUntilVoted: true });
    const p = (await getPoll(db, id, null))!;
    const other = p.options.at(-1)!;
    for (const k of [1, 2, 3]) await castVote(db, id, other.id, `h${k}`, null, [], [], 'Nitish Kumar');
    expect((await getPoll(db, id, 'h9'))!.otherTop).toEqual([]);
    const multi = await make({ allowOther: true, kind: 'multi' });
    expect((await getPoll(db, multi, null))!.options.some((o) => o.isOther)).toBe(false);
    const called = await make({ allowOther: true, calledIt: true });
    expect((await getPoll(db, called, null))!.options.some((o) => o.isOther)).toBe(false);
  });
});

describe('people who voted (Home)', () => {
  it('counts each voter once, however many polls they voted on', async () => {
    const before = await voterCount(db);
    const a = await make();
    const b = await make();
    const pa = (await getPoll(db, a, null))!;
    const pb = (await getPoll(db, b, null))!;
    await castVote(db, a, pa.options[0].id, 'vc1');
    await castVote(db, b, pb.options[0].id, 'vc1');
    await castVote(db, a, pa.options[1].id, 'vc2');
    expect((await voterCount(db)) - before).toBe(2);
  });
});

describe('step counter (admin)', () => {
  it('counts steps per day, shows 7 days with zeros, and never fails', async () => {
    const { countEvent, stepTable, STEP_DAYS } = await import('@/lib/events');
    const before = (await stepTable(db))[0].n.vote;
    await countEvent(db, 'vote');
    await countEvent(db, 'vote');
    await countEvent(db, 'shared_open');
    const t = await stepTable(db);
    expect(t.length).toBe(STEP_DAYS);
    expect(t[0].n.vote - before).toBe(2);
    expect(t[1].n.voter_created).toBeGreaterThanOrEqual(0);
  });
});

describe('visitor count (Home)', () => {
  it('adds up every day of first visits and only counts the visitor step', async () => {
    const { countEvent, visitorTotal } = await import('@/lib/events');
    const before = await visitorTotal(db);
    await countEvent(db, 'visitor');
    await countEvent(db, 'visitor');
    await countEvent(db, 'home_view');
    await db.insert(schema.dailyEvents).values({ day: '2026-01-01', event: 'visitor', n: 5 }).onConflictDoNothing();
    expect((await visitorTotal(db)) - before).toBe(7);
  });
});

describe('no approval step', () => {
  it('lists politics and photo polls the moment they are posted; the review page only has reported or paused polls', async () => {
    const pol = await make({ category: 'politics' });
    expect((await listPolls(db, 200)).some((p) => p.id === pol)).toBe(true);
    expect((await getReviewQueue(db)).some((r) => r.id === pol)).toBe(false);
    await reportPoll(db, pol, 'nr1', 'spam');
    expect((await getReviewQueue(db)).some((r) => r.id === pol)).toBe(true);
  });
});


describe('audit fixes (Oct 2026)', () => {
  it('Hindi choices that differ only by vowel signs are different; emoji-only differences count too', async () => {
    const { sameKey } = await import('@/lib/validation');
    expect(sameKey('पानी')).not.toBe(sameKey('पान'));
    expect(sameKey('Rahul')).toBe(sameKey('rahul.'));
    expect(sameKey('🍕 1')).not.toBe(sameKey('🍔 1'));
    expect(createPollSchema.safeParse({ title: 'Kya chahiye?', options: ['पानी', 'पान'] }).success).toBe(true);
  });
  it('changing a vote drops the old reason', async () => {
    const id = await make({ allowChange: true });
    await db.update(schema.polls).set({ reasons: JSON.stringify(['Leadership', 'Vision']) }).where(eq(schema.polls.id, id));
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'r1');
    await setReason(db, id, 'r1', 'Leadership');
    await castVote(db, id, p.options[1].id, 'r1');
    const after = (await getPoll(db, id, 'r1'))!;
    expect(after.options[1].reasons).toEqual([]);
  });
  it('"Called it" never lets a call change, and a group poll always ends', async () => {
    const called = await make({ calledIt: true, allowChange: true });
    const [c] = await db.select().from(schema.polls).where(eq(schema.polls.id, called));
    expect(c.allowChange).toBe(false);
    const group = await make({ groupSize: 3 });
    const [g] = await db.select().from(schema.polls).where(eq(schema.polls.id, group));
    expect(g.endsAt).not.toBeNull();
  });
  it('no undo once the poll has ended', async () => {
    const id = await make();
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'u1');
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    expect(await undoVote(db, id, 'u1')).toBe(false);
  });
  it('a politician written under "Other" makes it a politics poll', async () => {
    const id = await make({ allowOther: true, title: 'Who should lead the country?' });
    const p = (await getPoll(db, id, null))!;
    const other = p.options.find((o) => o.isOther)!;
    expect(await castVote(db, id, other.id, 'o1', null, [], [], 'Modi')).toBe('ok');
    const [row] = await db.select().from(schema.polls).where(eq(schema.polls.id, id));
    expect(row.category).toBe('politics');
    expect(row.reviewed).toBe(false);
  });
  it('a closed "Called it" poll without its answer is never "won" in My votes', async () => {
    const id = await make({ calledIt: true });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'c1');
    await castVote(db, id, p.options[0].id, 'c2');
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    const mine = (await getMyVotes(db, 'c1', 50)).find((v) => v.pollId === id)!;
    expect(mine.standing.kind).not.toBe('won');
  });
});

describe('show results at a set time', () => {
  it('hides the numbers from everyone until the reveal, then opens them', async () => {
    const id = await make({ revealIn: 'h1' });
    const p = (await getPoll(db, id, null))!;
    expect(p.revealAt).not.toBeNull();
    await castVote(db, id, p.options[0].id, 'rv1');
    await castVote(db, id, p.options[1].id, 'rv2');
    const voter = (await getPoll(db, id, 'rv1'))!;
    expect(voter.resultsVisible).toBe(false);
    expect(voter.totalVotes).toBe(0);
    expect(voter.options.every((o) => o.votes === 0)).toBe(true);
    expect(voter.participants).toBe(2);
    const mine = (await getMyVotes(db, 'rv1', 50)).find((v) => v.pollId === id)!;
    expect(mine.standing.kind).toBe('reveal');
    // The time comes: the result is open for everyone at once.
    await db.update(schema.polls).set({ revealAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    const after = (await getPoll(db, id, 'rv1'))!;
    expect(after.revealAt).toBeNull();
    expect(after.resultsVisible).toBe(true);
    expect(after.totalVotes).toBe(2);
  });
  it('is not used for group polls or "Called it", and right away means no reveal time', async () => {
    const group = await make({ revealIn: 'h1', groupSize: 3 });
    const called = await make({ revealIn: 'm30', calledIt: true });
    const now = await make({ revealIn: 'now' });
    for (const id of [group, called, now]) expect((await getPoll(db, id, null))!.revealAt).toBeNull();
  });
  it('"Show results at 9 pm" opens them at the 9 pm final count', async () => {
    const { nextFinalCount } = await import('@/lib/polls');
    const id = await make({ revealIn: 'ninepm' });
    const [row] = await db.select().from(schema.polls).where(eq(schema.polls.id, id));
    expect(row.revealAt?.getTime()).toBe(nextFinalCount().getTime());
  });
});

describe('views count (Home)', () => {
  it('adds up Home, poll and other page views on every day, and nothing else', async () => {
    const { countEvent, viewTotal } = await import('@/lib/events');
    const before = await viewTotal(db);
    await countEvent(db, 'home_view');
    await countEvent(db, 'poll_view');
    await countEvent(db, 'page_view');
    await countEvent(db, 'vote');
    await countEvent(db, 'visitor');
    await db.insert(schema.dailyEvents).values({ day: '2026-01-02', event: 'page_view', n: 4 }).onConflictDoNothing();
    expect((await viewTotal(db)) - before).toBe(7);
  });
});

describe('engagement score (admin)', () => {
  it('scores sharing, reactions and reasons, needs 3+ votes, and groups by topic', async () => {
    const { engagementScore, getEngagement } = await import('@/lib/stats');
    expect(engagementScore(0, 0, 0, 0)).toBe(0);
    expect(engagementScore(10, 10, 10, 10)).toBe(100);
    expect(engagementScore(10, 5, 0, 0)).toBe(25);
    expect(engagementScore(4, 0, 40, 0)).toBe(25); // reactions count at most one per vote
    const id = await make({ title: 'Engagement check', category: 'food' });
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'en1');
    await castVote(db, id, p.options[1].id, 'en2');
    expect((await getEngagement(db, 100)).polls.some((x) => x.id === id)).toBe(false);
    await castVote(db, id, p.options[0].id, 'en3');
    await toggleReaction(db, id, 'en1', (await getPoll(db, id, 'en1'))!.reactions[0].emoji);
    const e = await getEngagement(db, 100);
    const row = e.polls.find((x) => x.id === id)!;
    expect(row.votes).toBe(3);
    expect(row.score).toBe(engagementScore(3, 0, 1, 0));
    expect(e.topics.some((x) => x.category === 'food')).toBe(true);
  });
});

describe('join with a code', () => {
  it('gives a poll one 6-digit code, finds the poll by it (spaces allowed), and never for a hidden poll', async () => {
    const { ensureJoinCode, pollForJoinCode } = await import('@/lib/polls');
    const id = await make({ title: 'Join code check' });
    const code = (await ensureJoinCode(db, id))!;
    expect(code).toMatch(/^[1-9]\d{5}$/);
    expect(await ensureJoinCode(db, id)).toBe(code);
    expect(await pollForJoinCode(db, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(id);
    expect(await pollForJoinCode(db, '12')).toBeNull();
    const other = await make({ title: 'Join code two' });
    expect(await ensureJoinCode(db, other)).not.toBe(code);
    await setPollFlags(db, id, { hidden: true });
    expect(await pollForJoinCode(db, code)).toBeNull();
    expect(await ensureJoinCode(db, id)).toBeNull();
  });
});

describe('ask again every week', () => {
  it('opens the same question again when it ends, points back to it, and shows week by week', async () => {
    const { setWeekly, rollDueSeries, rollWeekly, weeklyTrend } = await import('@/lib/polls');
    const id = await make({ title: 'Weekly mood check', options: ['Good', 'Bad'] });
    expect(await setWeekly(db, id, true)).toBe(true);
    const first = (await getPoll(db, id, null))!;
    expect(first.endsAt).not.toBeNull();
    await castVote(db, id, first.options[0].id, 'wk1');
    // The week ends: the next one opens by itself, with the same choices and a future end.
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 60_000) }).where(eq(schema.polls.id, id));
    expect(await rollDueSeries(db)).toBeGreaterThanOrEqual(1);
    const nextId = (await rollWeekly(db, id))!;
    expect(nextId).not.toBe(id);
    const next = (await getPoll(db, nextId, null))!;
    expect(next.title).toBe('Weekly mood check');
    expect(next.options.map((o) => o.label)).toEqual(['Good', 'Bad']);
    expect(next.closed).toBe(false);
    expect(next.previous?.id).toBe(id);
    const [oldRow] = await db.select().from(schema.polls).where(eq(schema.polls.id, id));
    const [newRow] = await db.select().from(schema.polls).where(eq(schema.polls.id, nextId));
    expect([oldRow.repeatWeekly, newRow.repeatWeekly]).toEqual([false, true]);
    // Asking again does not make a second copy.
    expect(await rollWeekly(db, id)).toBe(nextId);
    const weeks = await weeklyTrend(db, nextId);
    expect(weeks.map((w) => w.id)).toEqual([nextId, id]);
    expect(weeks[1].voters).toBe(1);
  });
  it('is not offered for group polls', async () => {
    const { setWeekly } = await import('@/lib/polls');
    const group = await make({ title: 'Group weekly', groupSize: 3 });
    expect(await setWeekly(db, group, true)).toBe(false);
  });
});

describe('ideas first', () => {
  it('collects ideas (no voting) until the maker starts voting, then votes as usual', async () => {
    const { addIdea, startVoting } = await import('@/lib/polls');
    const id = await createPoll(db, createPollSchema.parse({ title: 'Where should we eat on Friday?', options: [], collectIdeas: true }));
    let p = (await getPoll(db, id, null))!;
    expect(p.ideas?.open).toBe(true);
    expect(await startVoting(db, id)).toBe('few');
    expect(await addIdea(db, id, 'Dosa place')).toBe('ok');
    expect(await addIdea(db, id, 'dosa  place')).toBe('exists');
    expect(await addIdea(db, id, 'Biryani house')).toBe('ok');
    p = (await getPoll(db, id, null))!;
    expect(p.options.map((o) => o.label)).toEqual(['Dosa place', 'Biryani house']);
    expect(await castVote(db, id, p.options[0].id, 'idea-v1')).toBe('ideas');
    expect((await listPolls(db, 500)).find((x) => x.id === id)?.ideas).toBe(true);
    expect(await startVoting(db, id)).toBe('ok');
    expect(await addIdea(db, id, 'Pizza')).toBe('closed');
    p = (await getPoll(db, id, null))!;
    expect(p.ideas?.open).toBe(false);
    expect(await castVote(db, id, p.options[0].id, 'idea-v1')).toBe('ok');
  });
  it('still needs 2 choices for a normal poll', () => {
    expect(createPollSchema.safeParse({ title: 'Only one choice?', options: ['A'] }).success).toBe(false);
  });
});

describe('knockout battles', () => {
  it('plays 4 choices two at a time: winners go through, ties go to the first, then a champion', async () => {
    const { createBattle, advanceBattle, getBattle } = await import('@/lib/battles');
    const entrants = ['Hyderabad', 'Lucknow', 'Kolkata', 'Delhi'].map((label) => ({ label, emoji: '' }));
    const id = await createBattle(db, { title: 'Best biryani city', entrants, roundHours: 24, showMaker: false, category: 'food' }, 'battle-owner');
    let b = (await getBattle(db, id, null))!;
    expect(b.rounds[0].map((m) => [m.a.label, m.b.label])).toEqual([['Hyderabad', 'Lucknow'], ['Kolkata', 'Delhi']]);
    expect(await advanceBattle(db, id)).toBe('waiting');
    // Lucknow wins match 1; match 2 is a tie (Kolkata, the first, goes through).
    const m1 = (await getPoll(db, b.rounds[0][0].pollId, null))!;
    await castVote(db, m1.id, m1.options[1].id, 'kb1');
    const m2 = (await getPoll(db, b.rounds[0][1].pollId, null))!;
    await castVote(db, m2.id, m2.options[0].id, 'kb2');
    await castVote(db, m2.id, m2.options[1].id, 'kb3');
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.battleId, id));
    expect(await advanceBattle(db, id)).toBe('next');
    b = (await getBattle(db, id, null))!;
    expect(b.rounds[1].map((m) => [m.a.label, m.b.label])).toEqual([['Lucknow', 'Kolkata']]);
    expect(b.rounds[0].map((m) => m.winner)).toEqual(['b', 'a']);
    const fin = (await getPoll(db, b.rounds[1][0].pollId, null))!;
    expect(fin.title).toBe('Best biryani city: Lucknow or Kolkata?');
    await castVote(db, fin.id, fin.options[1].id, 'kb4');
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, fin.id));
    expect(await advanceBattle(db, id)).toBe('champion');
    expect((await getBattle(db, id, null))!.champion).toBe('Kolkata');
    expect(await advanceBattle(db, id)).toBe('done');
  });
  it('needs 4 or 8 different choices', async () => {
    const { battleSchema } = await import('@/lib/validation');
    const e = (n: number) => Array.from({ length: n }, (_, k) => ({ label: `Choice ${k}`, emoji: '' }));
    expect(battleSchema.safeParse({ title: 'Best tea', entrants: e(3), roundHours: 24 }).success).toBe(false);
    expect(battleSchema.safeParse({ title: 'Best tea', entrants: e(8), roundHours: 24 }).success).toBe(true);
    expect(battleSchema.safeParse({ title: 'Best tea', entrants: e(4), roundHours: 5 }).success).toBe(false);
  });
});

describe('follow a topic', () => {
  it('reads back only real topics, once each', async () => {
    const { readFollowed } = await import('@/lib/follow');
    expect(readFollowed('cricket,food,cricket,hacker,%3Cscript%3E')).toEqual(['cricket', 'food']);
    expect(readFollowed(undefined)).toEqual([]);
  });
});

describe('verified badge', () => {
  it('the owner verifies a profile by its link, and the badge shows on its polls', async () => {
    const { setVerified, profileIdFrom } = await import('@/lib/verify');
    expect(profileIdFrom('https://chunav.lokeshbhatia.com/u/abc123?x=1')).toBe('abc123');
    expect(profileIdFrom('/u/abc123/')).toBe('abc123');
    await db.insert(schema.users).values({ id: 'veri-1', name: 'Maker One' });
    const id = await createPoll(db, createPollSchema.parse({ title: 'Verified maker poll', options: ['A', 'B'], showMaker: true }), undefined, undefined, 'veri-1');
    expect((await getPoll(db, id, null))!.maker?.verified).toBe(false);
    expect(await setVerified(db, 'https://x.example/u/veri-1', true)).toMatchObject({ id: 'veri-1' });
    expect((await getPoll(db, id, null))!.maker?.verified).toBe(true);
    expect(await setVerified(db, 'no-such-profile', true)).toBeNull();
  });
});

describe('similar polls, the maker\'s pick, and you vs a friend', () => {
  it('finds a live poll that asks the same thing, and not unrelated ones', async () => {
    const { findSimilar } = await import('@/lib/polls');
    const id = await make({ title: 'Best street food in Mumbai?', options: ['Vada pav', 'Pani puri'] });
    expect((await findSimilar(db, 'Which is the best street food of Mumbai')).map((p) => p.id)).toContain(id);
    expect((await findSimilar(db, 'Vada pav or pani puri?')).map((p) => p.id)).toContain(id);
    expect((await findSimilar(db, 'Best cricket captain ever?')).map((p) => p.id)).not.toContain(id);
    expect(await findSimilar(db, 'Best?')).toEqual([]); // too little to compare
  });

  it('shows the maker\'s pick to voters only after they vote, and only when the maker chose so', async () => {
    await db.insert(schema.users).values({ id: 'pick-maker', name: 'Riya' }).onConflictDoNothing();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Tea time snack?', options: ['Samosa', 'Pakora'], showMaker: true, showMakerPick: true, hideUntilVoted: false }), undefined, undefined, 'pick-maker');
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'mk-voter');
    await db.update(schema.polls).set({ makerVoter: 'mk-voter' }).where(eq(schema.polls.id, id));
    expect((await getPoll(db, id, 'mk-other'))!.makerPick).toBeNull(); // not voted yet
    await castVote(db, id, p.options[1].id, 'mk-other');
    expect((await getPoll(db, id, 'mk-other'))!.makerPick).toBe(p.options[0].id);
    expect((await getPoll(db, id, 'mk-voter'))!.makerPick).toBeNull(); // not shown to the maker
    // Off when the maker did not choose it, and never on politics.
    const off = await createPoll(db, createPollSchema.parse({ title: 'Lunch spot?', options: ['A', 'B'], showMaker: true }), undefined, undefined, 'pick-maker');
    const pol = await createPoll(db, createPollSchema.parse({ title: 'Who wins the state?', options: ['A', 'B'], showMaker: true, showMakerPick: true, category: 'politics' }), undefined, undefined, 'pick-maker');
    const [o] = await db.select().from(schema.polls).where(inArray(schema.polls.id, [off, pol]));
    expect(o.showMakerPick).toBe(false);
    expect((await db.select().from(schema.polls).where(eq(schema.polls.id, pol)))[0].showMakerPick).toBe(false);
  });

  it('counts how often you and a friend picked the same, over the polls they sent you', async () => {
    const ids = [await make({ title: 'Friend A?' }), await make({ title: 'Friend B?' }), await make({ title: 'Friend C?' })];
    const views = await Promise.all(ids.map(async (id) => (await getPoll(db, id, null))!));
    // The friend votes on all three; you come by their link each time.
    for (const v of views) await castVote(db, v.id, v.options[0].id, 'fr-them');
    const codes = await Promise.all(ids.map(async (id) => (await getPoll(db, id, 'fr-them'))!.myShareCode!));
    await castVote(db, ids[0], views[0].options[0].id, 'fr-me', codes[0]);
    expect((await getPoll(db, ids[0], 'fr-me', codes[0]))!.friendTogether).toBeNull(); // one poll is not enough to say
    await castVote(db, ids[1], views[1].options[1].id, 'fr-me', codes[1]);
    await castVote(db, ids[2], views[2].options[0].id, 'fr-me', codes[2]);
    expect((await getPoll(db, ids[2], 'fr-me', codes[2]))!.friendTogether).toEqual({ same: 2, all: 3 });
  });
});

describe('tie decider', () => {
  it('starts a decider with only the tied choices, once, for the maker only', async () => {
    const { tiedTop, startRunoff } = await import('@/lib/polls');
    await db.insert(schema.users).values({ id: 'tie-maker', name: 'Tie Maker' }).onConflictDoNothing();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Dinner spot?', options: ['Dhaba', 'Cafe', 'Home'], hideUntilVoted: false }), undefined, undefined, 'tie-maker');
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'tie-1');
    await castVote(db, id, p.options[1].id, 'tie-2');
    expect(await startRunoff(db, id, 'tie-maker', 'Decider')).toBeNull(); // not ended yet
    await db.update(schema.polls).set({ endsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    const ended = (await getPoll(db, id, null))!;
    expect(tiedTop(ended).map((o) => o.label)).toEqual(['Dhaba', 'Cafe']);
    expect(await startRunoff(db, id, 'someone-else', 'Decider')).toBeNull();
    const d = (await startRunoff(db, id, 'tie-maker', 'Decider'))!;
    const decider = (await getPoll(db, d, null))!;
    expect(decider.options.map((o) => o.label)).toEqual(['Dhaba', 'Cafe']);
    expect(decider.closed).toBe(false);
    expect(await startRunoff(db, id, 'tie-maker', 'Decider')).toBe(d); // once
  });
});

describe('post later and quiet polls', () => {
  it('keeps a "post later" poll out of lists and closed to votes until it opens', async () => {
    const startsAt = new Date(Date.now() + 3_600_000).toISOString();
    const id = await make({ title: 'Toss time question?', startsAt });
    const p = (await getPoll(db, id, null))!;
    expect(p.startsAt).toBe(startsAt);
    expect((await listPolls(db, 200)).some((x) => x.id === id)).toBe(false);
    expect(await castVote(db, id, p.options[0].id, 'later-1')).toBe('not_started');
    await db.update(schema.polls).set({ startsAt: new Date(Date.now() - 1000) }).where(eq(schema.polls.id, id));
    expect((await listPolls(db, 200)).some((x) => x.id === id)).toBe(true);
    expect((await getPoll(db, id, null))!.startsAt).toBeNull();
    expect(await castVote(db, id, p.options[0].id, 'later-1')).toBe('ok');
    // An end before the start, or a start weeks away, is refused.
    expect(createPollSchema.safeParse({ title: 'Bad order?', options: ['A', 'B'], startsAt, endsAt: new Date(Date.now() + 60_000).toISOString() }).success).toBe(false);
    expect(createPollSchema.safeParse({ title: 'Too far?', options: ['A', 'B'], startsAt: new Date(Date.now() + 30 * 86_400_000).toISOString() }).success).toBe(false);
  });

  it('marks a poll quiet for its maker when nobody has voted for a while', async () => {
    const { makerView } = await import('@/lib/maker');
    await db.insert(schema.users).values({ id: 'quiet-maker', name: 'Quiet Maker' }).onConflictDoNothing();
    const id = await createPoll(db, createPollSchema.parse({ title: 'Anyone there?', options: ['Yes', 'No'] }), undefined, undefined, 'quiet-maker');
    expect((await makerView(db, id, 'quiet-maker'))!.quiet).toBe(false); // brand new
    await db.update(schema.polls).set({ createdAt: new Date(Date.now() - 8 * 3_600_000) }).where(eq(schema.polls.id, id));
    expect((await makerView(db, id, 'quiet-maker'))!.quiet).toBe(true);
    const p = (await getPoll(db, id, null))!;
    await castVote(db, id, p.options[0].id, 'quiet-v');
    expect((await makerView(db, id, 'quiet-maker'))!.quiet).toBe(false); // a vote just now
  });
});

describe('one line, poll night, your week and circles', () => {
  it('saves a line only for a voter, filters words, shows it to others once results open, and hides it after reports', async () => {
    const { setTake, reportTake } = await import('@/lib/polls');
    const id = await make({ title: 'Chai or coffee tonight?', options: ['Chai', 'Coffee'] });
    const p = (await getPoll(db, id, null))!;
    expect(p.takesOn).toBe(true);
    expect(await setTake(db, id, 'line-1', 'Because chai is life')).toBe('not_voted');
    await castVote(db, id, p.options[0].id, 'line-1');
    expect(await setTake(db, id, 'line-1', 'x')).toBe('bad');
    expect(await setTake(db, id, 'line-1', 'a'.repeat(200))).toBe('bad');
    expect(await setTake(db, id, 'line-1', 'chutiya')).toBe('blocked');
    expect(await setTake(db, id, 'line-1', '  Because   chai is life ')).toBe('ok');
    const mine = (await getPoll(db, id, 'line-1'))!;
    expect(mine.myTake).toBe('Because chai is life');
    expect(mine.takes).toEqual([]); // your own line is shown as yours, not in the list
    await castVote(db, id, p.options[1].id, 'line-2');
    const other = (await getPoll(db, id, 'line-2'))!;
    expect(other.takes).toEqual([{ id: other.takes[0].id, text: 'Because chai is life', pick: 'Chai' }]);
    // Hidden results: nobody sees lines (a line says what its writer picked).
    const hid = await make({ title: 'Secret line poll?', options: ['A', 'B'], hideUntilVoted: true });
    const h = (await getPoll(db, hid, null))!;
    await castVote(db, hid, h.options[0].id, 'line-3');
    await setTake(db, hid, 'line-3', 'A is better');
    expect((await getPoll(db, hid, 'line-9'))!.takes).toEqual([]);
    // Reports: not your own; two people hide it.
    const lineId = other.takes[0].id;
    expect(await reportTake(db, id, lineId, 'line-1')).toBe(false);
    expect(await reportTake(db, id, lineId, 'line-2')).toBe(true);
    expect((await getPoll(db, id, 'line-2'))!.takes).toHaveLength(1);
    await reportTake(db, id, lineId, 'line-4');
    expect((await getPoll(db, id, 'line-2'))!.takes).toEqual([]);
    // Changing your vote clears your line (it was about the old pick).
    const changeable = await make({ title: 'Changeable line?', options: ['A', 'B'], allowChange: true });
    const c = (await getPoll(db, changeable, null))!;
    await castVote(db, changeable, c.options[0].id, 'line-5');
    await setTake(db, changeable, 'line-5', 'A all the way');
    await castVote(db, changeable, c.options[1].id, 'line-5');
    expect((await getPoll(db, changeable, 'line-5'))!.myTake).toBeNull();
    // Off for politics.
    const pol = await make({ title: 'Modi or Rahul as PM?', options: ['Modi', 'Rahul'] });
    const pp = (await getPoll(db, pol, null))!;
    expect(pp.takesOn).toBe(false);
    await castVote(db, pol, pp.options[0].id, 'line-6');
    expect(await setTake(db, pol, 'line-6', 'Just because')).toBe('not_allowed');
  });

  it('makes a poll night that starts now and stays out of public lists and Home', async () => {
    const { createPack, getPack, upcomingPacks } = await import('@/lib/packs');
    const { packSchema } = await import('@/lib/validation');
    const items = [
      { title: 'Best dancer here?', options: ['Riya', 'Aman'] },
      { title: 'Next song?', options: ['Bollywood', 'Punjabi', 'Old'] },
    ];
    // A night needs no start time; a match still does, and holds at most 4 polls.
    expect(packSchema.safeParse({ kind: 'room', title: 'Diwali night', polls: items }).success).toBe(true);
    expect(packSchema.safeParse({ kind: 'match', title: 'CSK vs MI', polls: items }).success).toBe(false);
    expect(packSchema.safeParse({ kind: 'match', title: 'CSK vs MI', startsAt: new Date(Date.now() + 3_600_000).toISOString(), polls: [...items, ...items, ...items] }).success).toBe(false);
    expect(packSchema.safeParse({ kind: 'room', title: 'Big night', polls: [...items, ...items, ...items] }).success).toBe(true);
    const parsed = items.map((x) => createPollSchema.parse({ ...x, hideUntilVoted: false }));
    const { id, pollIds } = await createPack(db, { kind: 'room', title: 'Diwali night', startsAt: new Date().toISOString() }, parsed, 'room-key');
    const pack = (await getPack(db, id, null))!;
    expect(pack.kind).toBe('room');
    expect(pack.views.map((v) => v.title)).toEqual(['Best dancer here?', 'Next song?']);
    const listed = await listPolls(db, 500);
    expect(pollIds.some((pid) => listed.some((x) => x.id === pid))).toBe(false);
    expect((await upcomingPacks(db, 50)).some((x) => x.id === id)).toBe(false);
    expect(await castVote(db, pollIds[0], pack.views[0].options[0].id, 'room-v')).toBe('ok');
  });

  it('counts a maker\'s week from public polls only', async () => {
    const { creatorWeek } = await import('@/lib/profiles');
    await db.insert(schema.users).values({ id: 'week-maker', name: 'Week Maker' }).onConflictDoNothing();
    const a = await createPoll(db, createPollSchema.parse({ title: 'Week poll one?', options: ['A', 'B'], hideUntilVoted: false }), undefined, undefined, 'week-maker');
    const b = await createPoll(db, createPollSchema.parse({ title: 'Week poll two?', options: ['A', 'B'], hideUntilVoted: false }), undefined, undefined, 'week-maker');
    const hidden = await createPoll(db, createPollSchema.parse({ title: 'Unlisted week poll?', options: ['A', 'B'] }), undefined, undefined, 'week-maker', { unlisted: true });
    const va = (await getPoll(db, a, null))!;
    const vb = (await getPoll(db, b, null))!;
    const vh = (await getPoll(db, hidden, null))!;
    for (let k = 0; k < 3; k++) await castVote(db, a, va.options[0].id, `wk-a${k}`);
    await castVote(db, b, vb.options[0].id, 'wk-b0');
    await castVote(db, hidden, vh.options[0].id, 'wk-h0');
    // An old vote does not count this week.
    await castVote(db, b, vb.options[1].id, 'wk-old');
    await db.update(schema.votes).set({ createdAt: new Date(Date.now() - 9 * 86_400_000) }).where(eq(schema.votes.voterKey, 'wk-old'));
    const week = await creatorWeek(db, 'week-maker');
    expect(week).toEqual({ votes: 4, made: 2, top: { id: a, title: 'Week poll one?', votes: 3 } });
  });

  it('tells you how your poll did today, and names one public poll that took off (never unlisted, never yours)', async () => {
    const { myPollNews, popularToday } = await import('@/lib/polls');
    await db.insert(schema.users).values({ id: 'pop-maker', name: 'Pop Maker' }).onConflictDoNothing();
    expect(await myPollNews(db, 'pop-maker')).toBeNull();
    const pub = await createPoll(db, createPollSchema.parse({ title: 'Samosa or kachori?', options: ['Samosa', 'Kachori'] }), undefined, undefined, 'pop-maker');
    const room = await createPoll(db, createPollSchema.parse({ title: 'Room only?', options: ['A', 'B'] }), undefined, undefined, 'someone-else', { unlisted: true });
    const vp = (await getPoll(db, pub, null))!;
    const vr = (await getPoll(db, room, null))!;
    for (let k = 0; k < 60; k++) await castVote(db, pub, vp.options[k % 2].id, `pop-p${k}`);
    for (let k = 0; k < 80; k++) await castVote(db, room, vr.options[0].id, `pop-r${k}`);
    expect(await myPollNews(db, 'pop-maker')).toEqual({ id: pub, title: 'Samosa or kachori?', n: 60, total: 60 });
    expect((await popularToday(db, null))?.id).toBe(pub);
    // Your own poll is in your news, not in "popular today".
    expect((await popularToday(db, 'pop-maker'))?.id).not.toBe(pub);
    expect((await popularToday(db, 'pop-maker'))?.id).not.toBe(room);
  });

  it('lists new polls with almost no votes, never yours or ones you voted on', async () => {
    const { freshPollIds } = await import('@/lib/polls');
    await db.insert(schema.users).values({ id: 'fresh-maker', name: 'Fresh Maker' }).onConflictDoNothing();
    const quiet = await createPoll(db, createPollSchema.parse({ title: 'Fresh quiet poll?', options: ['A', 'B'] }), undefined, undefined, 'fresh-maker');
    const busy = await createPoll(db, createPollSchema.parse({ title: 'Fresh busy poll?', options: ['A', 'B'] }));
    const room = await createPoll(db, createPollSchema.parse({ title: 'Fresh room poll?', options: ['A', 'B'] }), undefined, undefined, undefined, { unlisted: true });
    const vb = (await getPoll(db, busy, null))!;
    for (let k = 0; k < 5; k++) await castVote(db, busy, vb.options[0].id, `fr-b${k}`);
    const ids = await freshPollIds(db, null, null, 500);
    expect(ids).toContain(quiet);
    expect(ids).not.toContain(busy);
    expect(ids).not.toContain(room);
    expect(await freshPollIds(db, null, 'fresh-maker', 500)).not.toContain(quiet);
    const vq = (await getPoll(db, quiet, null))!;
    await castVote(db, quiet, vq.options[0].id, 'fr-me');
    expect(await freshPollIds(db, 'fr-me', null, 500)).not.toContain(quiet);
    // Older than a day: not new any more.
    await db.update(schema.polls).set({ createdAt: new Date(Date.now() - 30 * 3_600_000) }).where(eq(schema.polls.id, quiet));
    expect(await freshPollIds(db, null, null, 500)).not.toContain(quiet);
  });

  it('remembers which public poll inspired a new one, and counts them for its maker', async () => {
    const { remixCount } = await import('@/lib/polls');
    await db.insert(schema.users).values([{ id: 'rx-a', name: 'Asha' }, { id: 'rx-b', name: 'Bilal' }]).onConflictDoNothing();
    const orig = await createPoll(db, createPollSchema.parse({ title: 'Remix me?', options: ['A', 'B'] }), undefined, undefined, 'rx-a');
    const room = await createPoll(db, createPollSchema.parse({ title: 'Room remix?', options: ['A', 'B'] }), undefined, undefined, 'rx-a', { unlisted: true });
    const mine = await createPoll(db, createPollSchema.parse({ title: 'Remix me, mine?', options: ['A', 'B'], remixOf: orig }), undefined, undefined, 'rx-a');
    const theirs = await createPoll(db, createPollSchema.parse({ title: 'Remix me, my way?', options: ['A', 'C'], remixOf: orig }), undefined, undefined, 'rx-b');
    const fromRoom = await createPoll(db, createPollSchema.parse({ title: 'From a room?', options: ['A', 'B'], remixOf: room }), undefined, undefined, 'rx-b');
    const read = async (id: string) => (await db.select({ r: schema.polls.remixOf }).from(schema.polls).where(eq(schema.polls.id, id)))[0].r;
    expect(await read(theirs)).toBe(orig);
    // Your own poll does not count as inspiring you, and a private room's poll is never linked.
    expect(await read(mine)).toBeNull();
    expect(await read(fromRoom)).toBeNull();
    expect(await remixCount(db, orig)).toBe(1);
    await db.update(schema.polls).set({ hidden: true }).where(eq(schema.polls.id, theirs));
    expect(await remixCount(db, orig)).toBe(0);
  });

  it('tells the maker at 10, 50, 100 votes, each once', async () => {
    const { sendMilestone, wantMilestone, nearMilestone, nextMilestone } = await import('@/lib/push');
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(10)).toBe(50);
    expect(nextMilestone(1000)).toBeNull();
    expect([9, 10, 12, 13, 50, 55, 56].map(nearMilestone)).toEqual([false, true, true, false, true, true, false]);
    const pid = await createPoll(db, createPollSchema.parse({ title: 'Milestone poll?', options: ['A', 'B'] }));
    const sub = { endpoint: 'https://push.example/ms1', keys: { p256dh: 'p', auth: 'a' } };
    await wantMilestone(db, 'ms-voter', sub, pid, 'en');
    const got: string[] = [];
    const send = async (_s: unknown, payload: string) => (got.push(JSON.parse(payload).body), { gone: false, ok: true });
    expect(await sendMilestone(db, pid, 5, send)).toBe(0);
    expect(await sendMilestone(db, pid, 11, send)).toBe(1);
    expect(await sendMilestone(db, pid, 12, send)).toBe(0);
    expect(await sendMilestone(db, pid, 50, send)).toBe(1);
    expect(got).toEqual(['Your first 10 votes are in. Tap to see how it’s going.', 'Your poll reached 50 votes. Tap to see how it’s going.']);
    expect(await sendMilestone(db, pid, 1000, send)).toBe(1);
    // After the last one the wish is gone.
    expect(await db.select().from(schema.pushMilestones).where(eq(schema.pushMilestones.pollId, pid))).toEqual([]);
  });

  it('keeps a circle\'s polls for its members, out of public lists', async () => {
    const { createCircle, getCircle, joinCircle, leaveCircle, myCircles, ownerAction } = await import('@/lib/circles');
    await db.insert(schema.users).values([{ id: 'circ-a', name: 'Asha' }, { id: 'circ-b', name: 'Bilal' }, { id: 'circ-c', name: 'Chetan' }]).onConflictDoNothing();
    expect(await createCircle(db, 'circ-a', ' ', '👥')).toEqual({ ok: false, error: 'name' });
    const made = await createCircle(db, 'circ-a', 'Sharma family', '🏠');
    if (!made.ok) throw new Error('circle not made');
    const cid = made.id;
    const owner = (await getCircle(db, cid, 'circ-a'))!;
    expect(owner).toMatchObject({ name: 'Sharma family', emoji: '🏠', member: true, mine: true, members: 1 });
    // Not a member: the name only, no invite, no polls.
    const outsider = (await getCircle(db, cid, 'circ-b'))!;
    expect(outsider.member).toBe(false);
    expect(outsider.invite).toBeNull();
    expect(await joinCircle(db, cid, 'wrong-code', 'circ-b')).toEqual({ ok: false, error: 'not_found' });
    expect(await joinCircle(db, cid, owner.invite!, 'circ-b')).toEqual({ ok: true, id: cid });
    // A circle's poll: listed on its page, never in public lists.
    const pid = await createPoll(db, createPollSchema.parse({ title: 'Dinner tonight?', options: ['Pizza', 'Dal'] }), undefined, undefined, 'circ-b', { circleId: cid });
    expect((await listPolls(db, 500)).some((x) => x.id === pid)).toBe(false);
    expect((await getCircle(db, cid, 'circ-b'))!.list.map((x) => x.id)).toEqual([pid]);
    expect((await myCircles(db, 'circ-b'))[0]).toMatchObject({ id: cid, members: 2, polls: 1, mine: false });
    // A new invite link: the old one stops working. Only the maker may do it, and the maker cannot just leave.
    expect(await ownerAction(db, cid, 'circ-b', 'invite')).toEqual({ ok: false, error: 'not_allowed' });
    await ownerAction(db, cid, 'circ-a', 'invite');
    expect(await joinCircle(db, cid, owner.invite!, 'circ-c')).toEqual({ ok: false, error: 'not_found' });
    expect(await leaveCircle(db, cid, 'circ-a')).toEqual({ ok: false, error: 'not_allowed' });
    expect(await leaveCircle(db, cid, 'circ-b')).toEqual({ ok: true, id: cid });
    expect(await myCircles(db, 'circ-b')).toEqual([]);
    await ownerAction(db, cid, 'circ-a', 'delete');
    expect(await getCircle(db, cid, 'circ-a')).toBeNull();
    expect((await getPoll(db, pid, null))?.title).toBe('Dinner tonight?'); // its poll stays at its own link
  });
});
