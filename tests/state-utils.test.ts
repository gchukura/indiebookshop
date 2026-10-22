import { describe, expect, it } from 'vitest';
import { getStateAbbrev, getStateDisplayName, US_STATE_NAMES } from '@/lib/state-utils';

describe('getStateAbbrev', () => {
  it('converts full names case-insensitively', () => {
    expect(getStateAbbrev('California')).toBe('CA');
    expect(getStateAbbrev('new york')).toBe('NY');
    expect(getStateAbbrev('District of Columbia')).toBe('DC');
  });

  it('uppercases two-letter input', () => {
    expect(getStateAbbrev('tn')).toBe('TN');
  });

  it('returns unknown values trimmed, and empty for empty input', () => {
    expect(getStateAbbrev(' Ontario ')).toBe('Ontario');
    expect(getStateAbbrev('')).toBe('');
    expect(getStateAbbrev(null)).toBe('');
  });
});

describe('getStateDisplayName', () => {
  it('converts abbreviations and full names to the full name', () => {
    expect(getStateDisplayName('vt')).toBe('Vermont');
    expect(getStateDisplayName('Vermont')).toBe('Vermont');
  });

  it('round-trips with getStateAbbrev for every state', () => {
    for (const name of US_STATE_NAMES) {
      expect(getStateDisplayName(getStateAbbrev(name))).toBe(name);
    }
  });
});
