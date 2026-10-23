/**
 * URL slugs for the /bookshops location pages, and the mapping back to the
 * canonical state / city / county names. Pure functions — safe in client code.
 *
 *   /bookshops/california
 *   /bookshops/california/berkeley
 *   /bookshops/california/county/alameda
 */

import { STATE_ABBREV_TO_FULL, getStateAbbrev } from '@/lib/state-utils';

/** Lowercase, accents removed, punctuation stripped, spaces → hyphens. */
export function toLocationSlug(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // é → e
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SLUG_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREV_TO_FULL).map(([abbrev, full]) => [toLocationSlug(full), abbrev])
);

/** "CA" or "California" → "california". Non-US regions → ''. */
export function stateToSlug(state: string): string {
  const full = STATE_ABBREV_TO_FULL[getStateAbbrev(state)];
  return full ? toLocationSlug(full) : '';
}

/** "california" → "CA", or null if it isn't a US state slug. */
export function slugToState(slug: string): string | null {
  return SLUG_TO_STATE[slug.toLowerCase()] ?? null;
}

/** "Berkeley" → "berkeley", "St. Paul" → "st-paul". */
export function cityToSlug(city: string): string {
  return toLocationSlug(city);
}

/** County name without a trailing "County" / "Parish" / "Borough". */
export function stripCountySuffix(county: string): string {
  return county.trim().replace(/\s+(county|parish|borough|census area|municipality)$/i, '');
}

/** "Alameda" or "Alameda County" → "alameda". */
export function countyToSlug(county: string): string {
  return toLocationSlug(stripCountySuffix(county));
}

/** "Alameda" → "Alameda County"; Louisiana uses parishes, Alaska boroughs. */
export function countyDisplayName(county: string, state: string): string {
  const base = stripCountySuffix(county);
  const abbrev = getStateAbbrev(state);
  const unit = abbrev === 'LA' ? 'Parish' : abbrev === 'AK' ? 'Borough' : 'County';
  return `${base} ${unit}`;
}

export function statePath(state: string): string {
  return `/bookshops/${stateToSlug(state)}`;
}

export function cityPath(city: string, state: string): string {
  return `/bookshops/${stateToSlug(state)}/${cityToSlug(city)}`;
}

export function countyPath(county: string, state: string): string {
  return `/bookshops/${stateToSlug(state)}/county/${countyToSlug(county)}`;
}

/** True when the state is a US state or DC, i.e. it has location pages. */
export function hasStatePage(state: string | null | undefined): boolean {
  return Boolean(state && stateToSlug(state));
}
