/**
 * Search suggestions for the homepage search box: states, cities, and shops.
 * Pure; the /api/suggest route builds the entries once per data refresh.
 */

import type { Bookstore } from '@/shared/schema';
import type { LocationIndex } from './location-index';
import { getBookstoreSlug } from './slug';
import { getStateAbbrev } from '@/lib/state-utils';

export type SuggestionType = 'state' | 'city' | 'shop';

export type Suggestion = {
  type: SuggestionType;
  label: string;
  /** "12 bookshops" for places, "City, ST" for shops. */
  detail: string;
  href: string;
};

type Entry = Suggestion & { key: string; count: number };

/** Lowercase, accents and punctuation removed, single spaces: "St. Paul, MN" → "st paul mn". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const plural = (n: number) => `${n.toLocaleString('en-US')} bookshop${n === 1 ? '' : 's'}`;

export function buildSuggestionEntries(locations: LocationIndex, shops: Bookstore[]): Entry[] {
  const entries: Entry[] = [];
  for (const state of locations.states) {
    entries.push({ type: 'state', label: state.name, detail: plural(state.shops.length), href: `/bookshops/${state.slug}`, key: normalize(state.name), count: state.shops.length });
    for (const city of state.cities) {
      const label = `${city.name}, ${state.abbrev}`;
      entries.push({ type: 'city', label, detail: plural(city.shops.length), href: `/bookshops/${state.slug}/${city.slug}`, key: normalize(label), count: city.shops.length });
    }
  }
  for (const shop of shops) {
    entries.push({
      type: 'shop',
      label: shop.name,
      detail: [shop.city, getStateAbbrev(shop.state)].filter(Boolean).join(', '),
      href: `/bookshop/${getBookstoreSlug(shop)}`,
      key: normalize(shop.name),
      count: shop.googleReviewCount ?? 0,
    });
  }
  return entries;
}

const TYPE_ORDER: Record<SuggestionType, number> = { state: 0, city: 1, shop: 2 };

/**
 * Up to `limit` matches for `query`: whole-label prefix first, then a word
 * prefix, then anywhere; places before shops; bigger/better-known first.
 */
export function suggest(entries: Entry[], query: string, limit = 8): Suggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const scored: Array<{ e: Entry; score: number }> = [];
  for (const e of entries) {
    const score = e.key.startsWith(q) ? 0 : e.key.includes(` ${q}`) ? 1 : e.key.includes(q) ? 2 : -1;
    if (score >= 0) scored.push({ e, score });
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      TYPE_ORDER[a.e.type] - TYPE_ORDER[b.e.type] ||
      b.e.count - a.e.count ||
      a.e.label.localeCompare(b.e.label)
  );
  return scored.slice(0, limit).map(({ e }) => ({ type: e.type, label: e.label, detail: e.detail, href: e.href }));
}
