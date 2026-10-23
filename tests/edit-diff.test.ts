import { describe, expect, it } from 'vitest';
import type { Bookstore } from '@/shared/schema';
import { currentFields, diffFields } from '@/lib/data/edit-diff';

const shop = {
  id: 7, name: 'Test Books', street: '1 Main St', city: 'Austin', state: 'Texas', zip: '78701',
  phone: '(512) 555-0100', website: 'https://testbooks.com/', description: 'A shop.', featureIds: [2, 1],
} as unknown as Bookstore;

describe('diffFields', () => {
  const current = currentFields(shop);

  it('reports nothing when only formatting differs', () => {
    expect(diffFields(current, { ...current, state: 'TX', phone: '512-555-0100', website: 'https://TestBooks.com', description: 'A  shop. ', featureIds: [1, 2] })).toEqual([]);
  });

  it('lists only changed fields, before and after', () => {
    const changes = diffFields(current, { ...current, street: '2 Main St', website: '', featureIds: [1, 3] }, id => ['', 'Coffee Shop', 'Used Books', 'Rare Books'][id]);
    expect(changes).toEqual([
      { field: 'Street', before: '1 Main St', after: '2 Main St' },
      { field: 'Website', before: 'https://testbooks.com/', after: '—' },
      { field: 'Features', before: 'Coffee Shop, Used Books', after: 'Coffee Shop, Rare Books' },
    ]);
  });
});
