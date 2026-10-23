/**
 * Resolves the old /directory/{state,city,county}/... URLs (from the Vite app)
 * to the /bookshops pages. Those URLs used the Sheet's raw values, e.g.
 * /directory/state/CA, /directory/city/San%20Francisco, /directory/city/CA/Berkeley,
 * /directory/county/CA/Alameda.
 */

import { NextResponse } from 'next/server';
import { getLocationIndex } from './locations';
import { cityToSlug, countyToSlug, stateToSlug } from './location-slugs';
import type { StateLocation } from './location-index';

function findState(states: Record<string, StateLocation>, raw: string): StateLocation | undefined {
  // "CA", "California", or already a slug like "new-york"
  const value = decodeURIComponent(raw).trim();
  return states[stateToSlug(value)] ?? states[value.toLowerCase()];
}

/** 308 to an absolute URL on the request's origin. */
export function permanentRedirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 308);
}

export async function legacyStatePath(rawState: string): Promise<string> {
  const { statesBySlug } = await getLocationIndex();
  const state = findState(statesBySlug, rawState);
  return state ? `/bookshops/${state.slug}` : '/bookshops';
}

/** City with a state, or (older links) a city name alone — then the state with the most shops in that city wins. */
export async function legacyCityPath(rawCity: string, rawState?: string): Promise<string> {
  const { states, statesBySlug } = await getLocationIndex();
  const citySlug = cityToSlug(decodeURIComponent(rawCity));
  if (rawState) {
    const state = findState(statesBySlug, rawState);
    if (!state) return '/bookshops';
    return state.citiesBySlug[citySlug] ? `/bookshops/${state.slug}/${citySlug}` : `/bookshops/${state.slug}`;
  }
  const match = states
    .filter(s => s.citiesBySlug[citySlug])
    .sort((a, b) => b.citiesBySlug[citySlug].shops.length - a.citiesBySlug[citySlug].shops.length)[0];
  return match ? `/bookshops/${match.slug}/${citySlug}` : '/bookshops';
}

export async function legacyCountyPath(rawState: string, rawCounty: string): Promise<string> {
  const { statesBySlug } = await getLocationIndex();
  const state = findState(statesBySlug, rawState);
  if (!state) return '/bookshops';
  const countySlug = countyToSlug(decodeURIComponent(rawCounty));
  return state.countiesBySlug[countySlug] ? `/bookshops/${state.slug}/county/${countySlug}` : `/bookshops/${state.slug}`;
}
