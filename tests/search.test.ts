import { describe, expect, it } from 'vitest';
import type { Bookstore } from '@/shared/schema';
import { buildLocationIndex } from '@/lib/data/location-index';
import { makeCityKey } from '@/lib/data/location-key';
import { normalize, queryTokens, searchPlaces, searchShops, suggest } from '@/lib/data/search';

const mk = (id: number, name: string, city: string, state: string, reviews = 10, county: string | null = null) =>
  ({ id, name, slug: null, city, state, county, googleRating: '4.5', googleReviewCount: reviews, latitude: '1', longitude: '1', featureIds: [] }) as unknown as Bookstore;

const shops = [
  mk(1, 'Berkeley Books', 'Oakland', 'CA', 50, 'Alameda'),
  mk(2, 'Moe’s Books', 'Berkeley', 'CA', 900, 'Alameda'),
  mk(3, 'Pegasus Books', 'Berkeley', 'CA', 300, 'Alameda'),
  mk(4, 'Powell’s Books', 'Portland', 'OR', 9000, 'Multnomah'),
  mk(5, 'Annie Bloom’s Books', 'Portland', 'OR', 400, 'Multnomah'),
  mk(6, 'Print', 'Portland', 'ME', 100, 'Cumberland'),
  mk(7, 'Librería Española', 'Española', 'NM', 20, 'Rio Arriba'),
  mk(8, 'Powells', 'Chicago', 'IL', 5, 'Cook'),
];
const byState: Record<string, Bookstore[]> = {};
const byCity: Record<string, Bookstore[]> = {};
for (const s of shops) {
  (byState[s.state.toLowerCase()] ??= []).push(s);
  (byCity[makeCityKey(s.city, s.state)] ??= []).push(s);
}
const locations = buildLocationIndex({ byState, byCity, byCounty: {} });
const names = (list: Bookstore[]) => list.map(s => s.name);

describe('normalize and query tokens', () => {
  it('drops accents and apostrophes, splits on punctuation', () => {
    expect(normalize('Powell’s Books')).toBe('powells books');
    expect(normalize('Librería Española')).toBe('libreria espanola');
    expect(normalize('St. Paul, MN')).toBe('st paul mn');
  });

  it('ignores generic words unless they are the whole query', () => {
    expect(queryTokens('bookstores in Portland')).toEqual(['portland']);
    expect(queryTokens('bookstore')).toEqual(['bookstore']);
  });
});

describe('searchShops', () => {
  it('matches word prefixes, not substrings', () => {
    expect(names(searchShops(shops, 'peg'))).toEqual(['Pegasus Books']);
    expect(searchShops(shops, 'gasus')).toEqual([]);
  });

  it('is accent- and apostrophe-insensitive', () => {
    expect(names(searchShops(shops, 'espanola'))).toEqual(['Librería Española']);
    expect(names(searchShops(shops, 'libreria'))).toEqual(['Librería Española']);
    // "powell's" normalizes to "powells", which exactly names shop 8
    expect(names(searchShops(shops, "powell's"))).toEqual(['Powells', 'Powell’s Books']);
  });

  it('ranks an exact name, then name matches, then city matches', () => {
    // "Powells" exactly names shop 8; Powell’s Books only starts with it
    expect(names(searchShops(shops, 'powells'))).toEqual(['Powells', 'Powell’s Books']);
    // "Berkeley Books" is a name match; Moe’s and Pegasus are in Berkeley (city match)
    expect(names(searchShops(shops, 'berkeley'))).toEqual(['Berkeley Books', 'Moe’s Books', 'Pegasus Books']);
  });

  it('matches city + state together, and counties', () => {
    expect(names(searchShops(shops, 'portland me'))).toEqual(['Print']);
    expect(names(searchShops(shops, 'portland oregon'))).toEqual(['Powell’s Books', 'Annie Bloom’s Books']);
    expect(names(searchShops(shops, 'multnomah'))).toEqual(['Powell’s Books', 'Annie Bloom’s Books']);
  });
});

describe('searchPlaces', () => {
  it('finds cities by name, bigger first, exact first', () => {
    expect(searchPlaces(locations, 'portland').map(p => p.label)).toEqual(['Portland, OR', 'Portland, ME']);
    expect(searchPlaces(locations, 'portland, me').map(p => p.label)).toEqual(['Portland, ME']);
    expect(searchPlaces(locations, 'berkeley')[0]).toMatchObject({ type: 'city', label: 'Berkeley, CA', href: '/bookshops/california/berkeley', count: 2 });
  });

  it('finds states without listing every city in them', () => {
    expect(searchPlaces(locations, 'oregon').map(p => p.label)).toEqual(['Oregon']);
  });
});

describe('suggest', () => {
  it('lists places first, then shops, with links', () => {
    expect(suggest(locations, shops, 'berk').map(s => [s.type, s.label])).toEqual([
      ['city', 'Berkeley, CA'],
      ['shop', 'Berkeley Books'],
      ['shop', 'Moe’s Books'],
      ['shop', 'Pegasus Books'],
    ]);
    expect(suggest(locations, shops, 'bloom')[0]).toMatchObject({ type: 'shop', detail: 'Portland, OR', href: '/bookshop/annie-blooms-books' });
  });

  it('needs 2 characters and caps the list', () => {
    expect(suggest(locations, shops, 'b')).toEqual([]);
    expect(suggest(locations, shops, 'books', 3)).toHaveLength(3);
  });
});
