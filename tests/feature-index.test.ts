import { describe, expect, it } from 'vitest';
import type { Bookstore, Feature } from '@/shared/schema';
import { buildLocationIndex } from '@/lib/data/location-index';
import { makeCityKey } from '@/lib/data/location-key';
import { buildFeatureIndex, featureLinks, featurePhrase, featureSlug } from '@/lib/data/feature-index';
import { featureIntro, stateFeatureIntro } from '@/lib/data/location-content';

const mk = (id: number, city: string, state: string, featureIds: number[], rating = '4.5') =>
  ({ id, name: `Shop ${id}`, slug: null, city, state, county: null, googleRating: rating, latitude: '40', longitude: '-100', featureIds }) as unknown as Bookstore;

const shops = [
  mk(1, 'Austin', 'TX', [1, 2]), mk(2, 'Austin', 'TX', [2]), mk(3, 'Dallas', 'TX', [2]), mk(4, 'Houston', 'TX', [2, 3]),
  mk(5, 'Reno', 'NV', [2]), mk(6, 'Reno', 'NV', [1]), mk(7, 'Toronto', 'ON', [2]),
];
const byState: Record<string, Bookstore[]> = {};
const byCity: Record<string, Bookstore[]> = {};
const byFeature: Record<string, Bookstore[]> = {};
for (const s of shops) {
  (byState[s.state.toLowerCase()] ??= []).push(s);
  (byCity[makeCityKey(s.city, s.state)] ??= []).push(s);
  for (const f of s.featureIds) (byFeature[String(f)] ??= []).push(s);
}
const features: Feature[] = [{ id: 1, name: 'Coffee Shop' }, { id: 2, name: 'Used Books' }, { id: 3, name: 'Rare Books' }];
const index = buildFeatureIndex(features, byFeature, buildLocationIndex({ byState, byCity, byCounty: {} }));

describe('buildFeatureIndex', () => {
  it('keeps features with at least 3 US shops, most shops first', () => {
    expect(index.features.map(f => [f.slug, f.shops.length])).toEqual([['used-books', 5]]);
  });

  it('groups by US state (non-US shops left out) and makes state pages at 3+ shops', () => {
    const used = index.bySlug['used-books'];
    expect(used.states.map(s => [s.stateSlug, s.shops.length])).toEqual([['texas', 4], ['nevada', 1]]);
    expect(Object.keys(index.byState)).toEqual(['texas']);
    expect(index.byState.texas['used-books'].shops).toHaveLength(4);
  });

  it('links chips only for features that have a page', () => {
    expect(featureLinks(features, index)).toEqual({
      1: { name: 'Coffee Shop', href: null },
      2: { name: 'Used Books', href: '/bookshops/features/used-books' },
      3: { name: 'Rare Books', href: null },
    });
  });
});

describe('feature text', () => {
  it('phrases and slugs', () => {
    expect(featurePhrase('Coffee Shop')).toBe('a Coffee Shop');
    expect(featurePhrase("Children's Section")).toBe("a Children's Section");
    expect(featurePhrase('Used Books')).toBe('Used Books');
    expect(featureSlug("Children's Section")).toBe('childrens-section');
  });

  it('intros', () => {
    const used = index.bySlug['used-books'];
    expect(featureIntro(used)).toBe(
      '5 independent bookshops in the IndieBookShop directory have used books, across 2 states. The most are in Texas (4) and Nevada (1).'
    );
    const tx = buildLocationIndex({ byState, byCity, byCounty: {} }).statesBySlug.texas;
    expect(stateFeatureIntro(index.byState.texas['used-books'], tx)).toBe(
      '4 of the 4 independent bookshops in Texas have used books, in Austin, Dallas and Houston.'
    );
  });
});
