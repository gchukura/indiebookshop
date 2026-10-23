import { describe, expect, it } from 'vitest';
import {
  cityToSlug,
  countyDisplayName,
  countyToSlug,
  hasStatePage,
  slugToState,
  stateToSlug,
  toLocationSlug,
} from '@/lib/data/location-slugs';

describe('toLocationSlug', () => {
  it('lowercases, strips punctuation and accents, hyphenates spaces', () => {
    expect(toLocationSlug('St. Paul')).toBe('st-paul');
    expect(toLocationSlug('Coeur d’Alene')).toBe('coeur-dalene');
    expect(toLocationSlug('Española')).toBe('espanola');
    expect(toLocationSlug('Carmel-by-the-Sea')).toBe('carmel-by-the-sea');
    expect(toLocationSlug('  Winston -  Salem ')).toBe('winston-salem');
  });
});

describe('state slugs', () => {
  it('maps abbreviations and names to full-name slugs', () => {
    expect(stateToSlug('CA')).toBe('california');
    expect(stateToSlug('New York')).toBe('new-york');
    expect(stateToSlug('DC')).toBe('district-of-columbia');
  });

  it('round-trips through slugToState', () => {
    expect(slugToState(stateToSlug('NC'))).toBe('NC');
    expect(slugToState('North-Carolina')).toBe('NC');
  });

  it('has no pages for non-US regions', () => {
    expect(stateToSlug('ON')).toBe('');
    expect(slugToState('ontario')).toBeNull();
    expect(hasStatePage('BC')).toBe(false);
    expect(hasStatePage('TN')).toBe(true);
  });
});

describe('city and county slugs', () => {
  it('slugs cities', () => {
    expect(cityToSlug('San Francisco')).toBe('san-francisco');
  });

  it('drops a County/Parish suffix from county slugs', () => {
    expect(countyToSlug('Alameda County')).toBe('alameda');
    expect(countyToSlug('Alameda')).toBe('alameda');
    expect(countyToSlug('Orleans Parish')).toBe('orleans');
  });

  it('names counties with the right unit', () => {
    expect(countyDisplayName('Alameda', 'CA')).toBe('Alameda County');
    expect(countyDisplayName('Orleans Parish', 'LA')).toBe('Orleans Parish');
    expect(countyDisplayName('Juneau', 'AK')).toBe('Juneau Borough');
  });
});
