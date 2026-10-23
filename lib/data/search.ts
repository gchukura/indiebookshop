/**
 * Search: one matcher shared by /search, /api/suggest (homepage + header
 * search boxes), and the directory's ?q= filter, so results agree everywhere.
 *
 * A shop matches when every query word is the start of a word in its name,
 * city, state (name or abbreviation), or county. Ranking: exact name, then
 * name matches, then city/state matches, then anything else (e.g. county).
 * Pure and client-safe.
 */

import type { Bookstore } from '@/shared/schema';
import type { LocationIndex } from './location-index';
import { getBookstoreSlug } from './slug';
import { STATE_ABBREV_TO_FULL, getStateAbbrev } from '@/lib/state-utils';

/** Lowercase, accents removed, apostrophes dropped, other punctuation → spaces: "Powell’s Books" → "powells books". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const tokens = (text: string) => (text ? normalize(text).split(' ').filter(Boolean) : []);

/** Words that describe what's being searched for rather than which shop: dropped unless they're all there is. */
const GENERIC = new Set(['bookshop', 'bookshops', 'bookstore', 'bookstores', 'shop', 'shops', 'store', 'stores', 'indie', 'independent', 'in', 'near']);

export function queryTokens(query: string): string[] {
  const all = tokens(query);
  const specific = all.filter(t => !GENERIC.has(t));
  return specific.length ? specific : all;
}

/** Every query token is a prefix of at least one of `words`. */
const allPrefix = (q: string[], words: string[]) => q.every(t => words.some(w => w.startsWith(t)));

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

type SearchableShop = Pick<Bookstore, 'name' | 'city' | 'state' | 'county'>;

export enum MatchRank {
  ExactName = 0,
  Name = 1,
  Place = 2,
  Other = 3,
}

function placeWords(shop: SearchableShop): string[] {
  const abbrev = getStateAbbrev(shop.state);
  return [...tokens(shop.city), ...tokens(abbrev), ...tokens(STATE_ABBREV_TO_FULL[abbrev] ?? shop.state)];
}

/** How well `shop` matches the query tokens, or null if it doesn't. */
export function rankShop(shop: SearchableShop, q: string[], normalizedQuery: string): MatchRank | null {
  if (!q.length) return null;
  const name = tokens(shop.name);
  if (normalize(shop.name) === normalizedQuery) return MatchRank.ExactName;
  if (allPrefix(q, name)) return MatchRank.Name;
  const place = placeWords(shop);
  if (allPrefix(q, place)) return MatchRank.Place;
  if (allPrefix(q, [...name, ...place, ...tokens(shop.county ?? '')])) return MatchRank.Other;
  return null;
}

/**
 * Shops matching `query`, best first (rank, then name starting with the query,
 * then most Google reviews, then name). Works on any shop-like objects.
 */
export function searchShops<T extends SearchableShop & { googleReviewCount?: number | null }>(
  shops: T[],
  query: string,
  limit = Infinity
): T[] {
  const q = queryTokens(query);
  const nq = q.join(' ');
  const hits: Array<{ shop: T; rank: MatchRank; starts: number }> = [];
  for (const shop of shops) {
    const rank = rankShop(shop, q, nq);
    if (rank !== null) hits.push({ shop, rank, starts: normalize(shop.name).startsWith(nq) ? 0 : 1 });
  }
  hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.starts - b.starts ||
      (b.shop.googleReviewCount ?? 0) - (a.shop.googleReviewCount ?? 0) ||
      a.shop.name.localeCompare(b.shop.name)
  );
  return hits.slice(0, limit).map(h => h.shop);
}

// ---------------------------------------------------------------------------
// Places (cities and states)
// ---------------------------------------------------------------------------

export type PlaceMatch = {
  type: 'city' | 'state';
  /** "Berkeley, CA" / "California" */
  label: string;
  href: string;
  count: number;
};

/**
 * Cities and states matching `query`. A city matches when the query names it
 * (its own words, optionally with its state); a state when the query names
 * the state. Exact names first, then by shop count.
 */
export function searchPlaces(locations: LocationIndex, query: string, limit = Infinity): PlaceMatch[] {
  const q = queryTokens(query);
  if (!q.length) return [];
  const nq = q.join(' ');
  const hits: Array<PlaceMatch & { exact: boolean }> = [];
  for (const state of locations.states) {
    const stateWords = [...tokens(state.name), state.abbrev.toLowerCase()];
    if (allPrefix(q, stateWords)) {
      hits.push({ type: 'state', label: state.name, href: `/bookshops/${state.slug}`, count: state.shops.length, exact: normalize(state.name) === nq });
    }
    for (const city of state.cities) {
      const cityWords = tokens(city.name);
      // At least one query word must be part of the city's name, so "texas" doesn't list every Texas city
      if (q.some(t => cityWords.some(w => w.startsWith(t))) && allPrefix(q, [...cityWords, ...stateWords])) {
        hits.push({
          type: 'city',
          label: `${city.name}, ${state.abbrev}`,
          href: `/bookshops/${state.slug}/${city.slug}`,
          count: city.shops.length,
          exact: normalize(city.name) === nq || normalize(`${city.name} ${state.abbrev}`) === nq || normalize(`${city.name} ${state.name}`) === nq,
        });
      }
    }
  }
  const typeOrder = (p: PlaceMatch) => (p.type === 'state' ? 0 : 1);
  hits.sort((a, b) => Number(b.exact) - Number(a.exact) || typeOrder(a) - typeOrder(b) || b.count - a.count || a.label.localeCompare(b.label));
  return hits.slice(0, limit).map(({ type, label, href, count }) => ({ type, label, href, count }));
}

// ---------------------------------------------------------------------------
// Suggestions (search boxes)
// ---------------------------------------------------------------------------

export type Suggestion = {
  type: 'state' | 'city' | 'shop';
  label: string;
  /** "12 bookshops" for places, "City, ST" for shops. */
  detail: string;
  href: string;
};

const plural = (n: number) => `${n.toLocaleString('en-US')} bookshop${n === 1 ? '' : 's'}`;

/** Up to `limit` suggestions: matching places first (at most 3), then shops. Needs 2+ characters. */
export function suggest(locations: LocationIndex, shops: Bookstore[], query: string, limit = 8): Suggestion[] {
  if (normalize(query).length < 2) return [];
  const places = searchPlaces(locations, query, Math.min(3, limit)).map(p => ({
    type: p.type,
    label: p.label,
    detail: plural(p.count),
    href: p.href,
  }));
  const shopHits = searchShops(shops, query, limit - places.length).map(s => ({
    type: 'shop' as const,
    label: s.name,
    detail: [s.city, getStateAbbrev(s.state)].filter(Boolean).join(', '),
    href: `/bookshop/${getBookstoreSlug(s)}`,
  }));
  return [...places, ...shopHits];
}
