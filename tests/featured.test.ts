import { describe, expect, it } from 'vitest';
import type { Bookstore } from '@/shared/schema';
import { daysSinceEpoch, pickFeaturedBookstores } from '@/lib/data/featured';

const shop = (id: number, rating: string | null, imageUrl: string | null) =>
  ({ id, name: `Shop ${id}`, googleRating: rating, imageUrl }) as Bookstore;

const shops = [
  ...Array.from({ length: 10 }, (_, i) => shop(i + 1, '4.8', `/photos/${i + 1}.webp`)),
  ...Array.from({ length: 10 }, (_, i) => shop(i + 11, '4.9', null)),
  ...Array.from({ length: 10 }, (_, i) => shop(i + 21, '3.5', `/photos/${i + 21}.webp`)),
];

describe('pickFeaturedBookstores', () => {
  it('is deterministic for a given day and input order', () => {
    const a = pickFeaturedBookstores(shops, 8, 20_000).map(b => b.id);
    const b = pickFeaturedBookstores([...shops].reverse(), 8, 20_000).map(b => b.id);
    expect(a).toEqual(b);
  });

  it('changes with the day', () => {
    const days = [20_000, 20_001, 20_002].map(d => pickFeaturedBookstores(shops, 8, d).map(b => b.id).join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('prefers shops rated ≥ 4.5 with a photo', () => {
    const picked = pickFeaturedBookstores(shops, 8, 20_000);
    expect(picked).toHaveLength(8);
    expect(picked.every(b => b.id <= 10)).toBe(true);
  });

  it('tops up from other highly rated shops, then any shop', () => {
    const ids = pickFeaturedBookstores(shops, 25, 20_000).map(b => b.id);
    expect(ids.slice(0, 10).every(id => id <= 10)).toBe(true);
    expect(ids.slice(10, 20).every(id => id >= 11 && id <= 20)).toBe(true);
    expect(ids.slice(20).every(id => id >= 21)).toBe(true);
  });
});

describe('daysSinceEpoch', () => {
  it('counts whole UTC days', () => {
    expect(daysSinceEpoch(new Date('1970-01-02T00:00:00Z'))).toBe(1);
    expect(daysSinceEpoch(new Date('1970-01-02T23:59:59Z'))).toBe(1);
  });
});
