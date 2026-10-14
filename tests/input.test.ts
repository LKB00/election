import { describe, expect, it } from 'vitest';
import { hasBlockedWord, namesPolitics } from '@/lib/moderation';
import { cleanText, createPollSchema, isEmoji, voteSchema } from '@/lib/validation';

describe('typed text', () => {
  it('removes invisible characters, line breaks and NUL, keeps emoji joiners', () => {
    expect(cleanText('  Rock\n& Roll\u0000 #1​  ')).toBe('Rock & Roll #1');
    expect(cleanText('👨‍👩‍👧')).toBe('👨‍👩‍👧');
  });
  it('refuses titles and choices that are only invisible characters', () => {
    expect(createPollSchema.safeParse({ title: '​​​', options: ['​', '‌'] }).success).toBe(false);
  });
  it('sees duplicates that differ only by spaces or case', () => {
    expect(createPollSchema.safeParse({ title: 'Which latte?', options: ['Chai  Latte', 'chai latte'] }).success).toBe(false);
  });
  it('accepts keycap and tag-flag emoji', () => {
    expect(isEmoji('1️⃣')).toBe(true);
    expect(isEmoji('🏴󠁧󠁢󠁳󠁣󠁴󠁿')).toBe(true);
  });
  it('refuses odd option ids', () => {
    expect(voteSchema.safeParse({ optionId: 'a\u0000b' }).success).toBe(false);
    expect(voteSchema.parse({ optionId: 'abc', via: 'x y' }).via).toBeNull();
  });
});

describe('abuse filter', () => {
  it('is not fooled by hidden characters, _ , digits or stretched letters', () => {
    for (const t of ['chu​tiya test', 'chu­tiya', 'ch_utiya', 'chut1ya', 'chutiyaaa']) expect(hasBlockedWord(t), t).toBe(true);
  });
  it('catches the many spellings of Hindi abuse (Latin letters and Devanagari)', () => {
    for (const t of ['chootia', 'chutia', 'CHUTIYAA', 'c h u t i y a', 'c.h.u.t.i.y.a', 'ch*tiya', 'b*nchod', 'bhenchodd', 'madarchood', 'bhosadike', 'gaandu', 'bhadwe', 'haraamii', 'kuttiya', 'lavde', 'bsdk', 'गाँडू', 'गाडू', 'भोसडी', 'भडवा'])
      expect(hasBlockedWord(t), t).toBe(true);
  });
  it('does not trip on everyday words that look close', () => {
    for (const t of ['chakka or four', 'Kaminey movie', 'Gandhinagar', 'Chandigarh', 'Randeep Hooda', 'Bhangra or garba', 'Chamarajanagar', 'jhanda', 'Kuttanad', 'Lodhi garden', 'r a n d o m', 'Sh*hrukh or Salman', 'Mulla Nasruddin', 'Lavender', 'Gaandiv', 'गांधी', 'भांगड़ा'])
      expect(hasBlockedWord(t), t).toBe(false);
  });
  it('lets real names and normal words through', () => {
    for (const t of ['Niki Lauda vs Senna', 'Lund University', 'Katwa town trip', 'pakki dosti', 'Scunthorpe', 'IPL 2024']) expect(hasBlockedWord(t), t).toBe(false);
  });
  it('finds politicians behind zero-width characters', () => {
    expect(namesPolitics('Mod​i vs Rah‍ul')).toBe(true);
  });
});

describe('share image text', () => {
  it('never cuts an emoji in half and adds …', async () => {
    const { clip, faceLabels } = await import('@/lib/labels');
    expect(clip('abcdefghijklmno👨‍👩‍👧xyz', 16)).toBe('abcdefghijklmno…');
    expect(clip('Short', 16)).toBe('Short');
    expect(clip('Who is the best captain of all time in India', 20)).toBe('Who is the best…');
    expect(faceLabels(['🍕 Pizza', '🇮🇳 India'])).toEqual(['P', 'I']);
  });
});
