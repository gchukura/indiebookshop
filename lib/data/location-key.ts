import { getStateAbbrev } from '@/lib/state-utils';

/**
 * Index keys for byCity / byCounty: "<place>|<state abbrev>", lowercased.
 * `|` is used because place names can contain hyphens (e.g. "Winston-Salem").
 */
const SEPARATOR = '|';

/** Key for a city (or county) within a state. State may be a name or abbreviation. */
export function makeCityKey(city: string, state: string): string {
  return `${city.trim().toLowerCase()}${SEPARATOR}${getStateAbbrev(state).toLowerCase()}`;
}

/** Inverse of makeCityKey: { city, state } as stored in the key (lowercased). */
export function splitCityKey(key: string): { city: string; state: string } {
  const i = key.lastIndexOf(SEPARATOR);
  return i < 0 ? { city: key, state: '' } : { city: key.slice(0, i), state: key.slice(i + 1) };
}
