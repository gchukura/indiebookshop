import { describe, expect, it } from 'vitest';
import type { Bookstore } from '@/shared/schema';
import { buildLocationIndex } from '@/lib/data/location-index';
import { makeCityKey } from '@/lib/data/location-key';
import { buildSuggestionEntries, normalize, suggest } from '@/lib/data/suggest';

const mk = (id: number, name: string, city: string, state: string, reviews = 10) =>
  ({ id, name, slug: null, city, state, county: null, googleRating: '4.5', googleReviewCount: reviews, latitude: '1', longitude: '1', featureIds: [] }) as unknown as Bookstore;

const shops = [
  mk(1, 'Berkeley Books', 'Oakland', 'CA', 50),
  mk(2, 'Moe’s Books', 'Berkeley', 'CA', 900),
  mk(3, 'Pegasus Books', 'Berkeley', 'CA', 300),
  mk(4, 'Powell’s Books', 'Portland', 'OR', 9000),
  mk(5, 'Annie Bloom’s Books', 'Portland', 'OR', 400),
  mk(6, 'Print', 'Portland', 'ME', 100),
];
const byState: Record<string, Bookstore[]> = {};
const byCity: Record<string, Bookstore[]> = {};
for (const s of shops) {
  (byState[s.state.toLowerCase()] ??= []).push(s);
  (byCity[makeCityKey(s.city, s.state)] ??= []).push(s);
}
const entries = buildSuggestionEntries(buildLocationIndex({ byState, byCity, byCounty: {} }), shops);

describe('suggest', () => {
  it('normalizes punctuation, case, and accents', () => {
    expect(normalize('St. Paul, MN')).toBe('st paul mn');
    expect(normalize('Moe’s Books')).toBe('moe s books');
    expect(normalize('Española')).toBe('espanola');
  });

  it('puts places before shops for the same kind of match', () => {
    expect(suggest(entries, 'berk').map(s => [s.type, s.label])).toEqual([
      ['city', 'Berkeley, CA'],
      ['shop', 'Berkeley Books'],
    ]);
  });

  it('ranks bigger places first and links to the right pages', () => {
    const port = suggest(entries, 'portland');
    expect(port.map(s => s.label).slice(0, 2)).toEqual(['Portland, OR', 'Portland, ME']);
    expect(port[0]).toMatchObject({ href: '/bookshops/oregon/portland', detail: '2 bookshops' });
  });

  it('matches "city, ST" queries and word starts inside names', () => {
    expect(suggest(entries, 'portland, me')[0].label).toBe('Portland, ME');
    expect(suggest(entries, 'bloom')[0]).toMatchObject({ type: 'shop', label: 'Annie Bloom’s Books', detail: 'Portland, OR', href: '/bookshop/annie-blooms-books' });
  });

  it('needs at least 2 characters and caps the results', () => {
    expect(suggest(entries, 'b')).toEqual([]);
    expect(suggest(entries, 'books', 3)).toHaveLength(3);
  });
});
