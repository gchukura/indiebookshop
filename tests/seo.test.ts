import { describe, expect, it } from 'vitest';
import { fitTitle, placeTitle } from '@/lib/seo';

describe('titles', () => {
  it('fitTitle picks the first candidate that fits, else cuts at a word', () => {
    expect(fitTitle(['a'.repeat(61), 'short'])).toBe('short');
    const cut = fitTitle(['word '.repeat(20).trim()]);
    expect(cut.length).toBeLessThanOrEqual(60);
    expect(cut.endsWith('word…')).toBe(true);
  });

  it('placeTitle shortens step by step', () => {
    expect(placeTitle('Vermont', 'Vermont', 23)).toBe('Independent Bookshops in Vermont (23) | IndieBookShop');
    expect(placeTitle('District of Columbia', 'DC', 23)).toBe('Independent Bookshops in DC (23) | IndieBookShop');
    expect(placeTitle('Carmel-by-the-Sea, California', 'Carmel-by-the-Sea, CA', 1)).toBe('Bookshops in Carmel-by-the-Sea, CA (1) | IndieBookShop');
  });
});
