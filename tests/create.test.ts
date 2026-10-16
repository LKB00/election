import { describe, expect, it } from 'vitest';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';

describe('start a duel helpers', () => {
  it('reads choices out of the question', () => {
    expect(choicesFromQuestion('Virat, Rohit or Dhoni?')).toEqual(['Virat', 'Rohit', 'Dhoni']);
    expect(choicesFromQuestion('chai or coffee?')).toEqual(['Chai', 'Coffee']);
    expect(choicesFromQuestion('Who is better: CSK vs MI')).toEqual(['CSK', 'MI']);
    expect(choicesFromQuestion('Who is better Virat or Rohit?')).toEqual(['Virat', 'Rohit']);
    expect(choicesFromQuestion('Chai ya coffee?')).toEqual(['Chai', 'Coffee']);
    expect(choicesFromQuestion('चाय या कॉफ़ी?')).toEqual(['चाय', 'कॉफ़ी']);
    expect(choicesFromQuestion('Best biryani city?')).toBeNull();
  });
  it('suggests an emoji for common choices, whole words only', () => {
    expect(emojiFor('Chai')).toBe('🫖');
    expect(emojiFor('Masala chai')).toBe('🫖');
    expect(emojiFor('Hyderabad')).toBe('');
    expect(emojiFor('आमिर')).toBe('');
    expect(emojiFor('Natasha')).toBe('');
  });
});

describe('ready choices for a question without "or"', () => {
  it('finds the topic by whole words, in English, Hinglish and Hindi', async () => {
    const { choiceTopic } = await import('@/lib/createHelp');
    const { dict } = await import('@/lib/i18n');
    expect(choiceTopic('Best Diwali sweet?')).toBe('sweet');
    expect(choiceTopic('Sabse achhi mithai?')).toBe('sweet');
    expect(choiceTopic('सबसे अच्छी मिठाई?')).toBe('sweet');
    expect(choiceTopic('Best captain ever?')).toBe('cricketer');
    expect(choiceTopic('Which team will win?')).toBeNull();
    // Whole words: "sweetest" or "pets" inside another word do not count.
    expect(choiceTopic('Who is the sweetest?')).toBeNull();
    expect(choiceTopic('Carpets or rugs')).toBeNull();
    // Every topic has choices in all three languages, within the poll limits.
    for (const lang of ['en', 'hi', 'hg'] as const) {
      for (const [k, c] of Object.entries(dict[lang].choiceSets)) {
        expect(c.length, `${lang} ${k}`).toBeGreaterThanOrEqual(2);
        expect(new Set(c).size).toBe(c.length);
      }
      expect(Object.keys(dict[lang].choiceSets).sort()).toEqual(Object.keys(dict.en.choiceSets).sort());
    }
  });
});
