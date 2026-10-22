import { describe, expect, it } from 'vitest';
import { makeCityKey, splitCityKey } from '@/lib/data/location-key';

describe('makeCityKey', () => {
  it('lowercases, trims, and uses the state abbreviation', () => {
    expect(makeCityKey(' Nashville ', 'Tennessee')).toBe('nashville|tn');
    expect(makeCityKey('Nashville', 'TN')).toBe('nashville|tn');
  });

  it('round-trips names that contain hyphens', () => {
    const key = makeCityKey('Winston-Salem', 'North Carolina');
    expect(key).toBe('winston-salem|nc');
    expect(splitCityKey(key)).toEqual({ city: 'winston-salem', state: 'nc' });
  });

  it('round-trips county names', () => {
    expect(splitCityKey(makeCityKey('Miami-Dade', 'FL'))).toEqual({ city: 'miami-dade', state: 'fl' });
  });
});
