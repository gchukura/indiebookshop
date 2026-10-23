import { describe, expect, it } from 'vitest';
import type { Bookstore, Feature } from '@/shared/schema';
import { buildLocationIndex } from '@/lib/data/location-index';
import { makeCityKey } from '@/lib/data/location-key';
import { cityIntro, countyIntro, featureSentence, joinList, stateIntro, toMetaDescription } from '@/lib/data/location-content';

const mk = (id: number, city: string, county: string, featureIds: number[] = []) =>
  ({ id, name: `Shop ${id}`, slug: null, city, state: 'VT', county, googleRating: null, latitude: '44', longitude: '-73', featureIds }) as unknown as Bookstore;

const shops = [
  mk(1, 'Burlington', 'Chittenden', [1]),
  mk(2, 'Burlington', 'Chittenden', [1, 2]),
  mk(3, 'Winooski', 'Chittenden'),
  mk(4, 'Middlebury', 'Addison', [2]),
];
const byCity: Record<string, Bookstore[]> = {};
const byCounty: Record<string, Bookstore[]> = {};
for (const s of shops) {
  (byCity[makeCityKey(s.city, 'VT')] ??= []).push(s);
  (byCounty[makeCityKey(s.county!, 'VT')] ??= []).push(s);
}
const vt = buildLocationIndex({ byState: { vt: shops }, byCity, byCounty }).statesBySlug.vermont;
const features: Feature[] = [{ id: 1, name: 'Coffee Shop' }, { id: 2, name: 'Used Books' }];

describe('intros', () => {
  it('state intro names the top cities that have more than one shop', () => {
    expect(stateIntro(vt)).toBe(
      'Vermont has 4 independent bookshops in the IndieBookShop directory, across 3 cities and towns. The most are in Burlington (2).'
    );
  });

  it('city intro mentions other towns in the county', () => {
    expect(cityIntro(vt, vt.citiesBySlug.burlington)).toBe(
      'Burlington, Vermont has 2 independent bookshops. Elsewhere in Chittenden County, there are shops in Winooski.'
    );
    expect(cityIntro(vt, vt.citiesBySlug.middlebury)).toBe('Middlebury, Vermont has one independent bookshop: Shop 4.');
  });

  it('county intro lists its towns', () => {
    expect(countyIntro(vt, vt.countiesBySlug.chittenden)).toBe(
      'Chittenden County, Vermont has 3 independent bookshops in Burlington and Winooski.'
    );
  });

  it('adds café and used-book counts when features exist', () => {
    expect(featureSentence(shops, features)).toBe('2 have a café and 2 sell used books.');
    expect(featureSentence(shops, [])).toBe('');
    expect(stateIntro(vt, features)).toMatch(/ 2 have a café and 2 sell used books\.$/);
  });
});

describe('text helpers', () => {
  it('joinList', () => {
    expect(joinList(['A'])).toBe('A');
    expect(joinList(['A', 'B'])).toBe('A and B');
    expect(joinList(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('toMetaDescription cuts at a word boundary', () => {
    const text = 'word '.repeat(60).trim();
    const meta = toMetaDescription(text);
    expect(meta.length).toBeLessThanOrEqual(160);
    expect(meta.endsWith('word…')).toBe(true);
  });
});
