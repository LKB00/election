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
