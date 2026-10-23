import { describe, expect, it } from 'vitest';
import type { Bookstore } from '@/shared/schema';
import { shopTimeZone } from '@/lib/data/timezones';
import { nearestBookstores } from '@/lib/data/nearby';

describe('shopTimeZone', () => {
  it('uses the state zone', () => {
    expect(shopTimeZone('CA')).toBe('America/Los_Angeles');
    expect(shopTimeZone('Arizona')).toBe('America/Phoenix');
  });

  it('applies county exceptions in split states', () => {
    expect(shopTimeZone('TN', 'Davidson')).toBe('America/Chicago');
    expect(shopTimeZone('TN', 'Knox County')).toBe('America/New_York');
    expect(shopTimeZone('TX', 'El Paso')).toBe('America/Denver');
    expect(shopTimeZone('FL', 'Escambia')).toBe('America/Chicago');
  });

  it('uses longitude in Kentucky and gives up near the line', () => {
    expect(shopTimeZone('KY', null, '-87.5')).toBe('America/Chicago');
    expect(shopTimeZone('KY', null, '-84.5')).toBe('America/New_York');
    expect(shopTimeZone('KY', null, '-85.9')).toBeNull();
  });

  it('returns null outside the US', () => {
    expect(shopTimeZone('ON')).toBeNull();
  });
});

describe('nearestBookstores', () => {
  const shop = (id: number, state: string, lat: string | null, lng: string | null) =>
    ({ id, name: `S${id}`, state, latitude: lat, longitude: lng }) as Bookstore;
  const all = [
    shop(1, 'TN', '36.16', '-86.78'), // Nashville
    shop(2, 'TN', '36.17', '-86.77'), // ~1 km away
    shop(3, 'TN', '35.96', '-83.92'), // Knoxville
    shop(4, 'KY', '36.30', '-86.60'), // across the state line, still close
    shop(5, 'TN', null, null),
  ];

  it('orders by distance in miles, across state lines', () => {
    const near = nearestBookstores(all, all[0], 3);
    expect(near.map(n => n.shop.id)).toEqual([2, 4, 3]);
    expect(near[0].miles).toBeGreaterThan(0.5);
    expect(near[0].miles).toBeLessThan(1);
  });

  it('falls back to same-state shops without distance when the shop has no coordinates', () => {
    expect(nearestBookstores(all, all[4], 6).map(n => [n.shop.id, n.miles])).toEqual([[1, undefined], [2, undefined], [3, undefined]]);
  });
});

describe('nearest', () => {
  it('sorts by miles, honours the radius, skips shops without coordinates', async () => {
    const { nearest, haversineMiles } = await import('@/lib/data/geo');
    const at = (id: number, lat: string | null, lng: string | null) => ({ id, latitude: lat, longitude: lng });
    const shops = [at(1, '36.17', '-86.77'), at(2, '35.96', '-83.92'), at(3, null, null), at(4, '36.16', '-86.78')];
    expect(nearest(shops, 36.16, -86.78, 10).map(h => h.shop.id)).toEqual([4, 1, 2]);
    expect(nearest(shops, 36.16, -86.78, 10, 25).map(h => h.shop.id)).toEqual([4, 1]);
    expect(nearest(shops, 36.16, -86.78, 1)).toHaveLength(1);
    // Nashville → Knoxville is ~160 miles
    expect(haversineMiles({ lat: 36.16, lng: -86.78 }, { lat: 35.96, lng: -83.92 })).toBeGreaterThan(150);
  });
});
