/**
 * "Suggest an edit": which fields a suggestion changes compared with the
 * shop's current data. Pure, so the API route and tests share it.
 */

import type { Bookstore } from '@/shared/schema';
import { getStateAbbrev } from '@/lib/state-utils';

/** The fields the submission form can change. */
export type EditableFields = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  description: string;
  featureIds: number[];
};

export type FieldChange = { field: string; before: string; after: string };

const LABELS: Record<keyof EditableFields, string> = {
  name: 'Name',
  street: 'Street',
  city: 'City',
  state: 'State',
  zip: 'Zip',
  phone: 'Phone',
  website: 'Website',
  description: 'Description',
  featureIds: 'Features',
};

/** The current values of a shop in form terms (state as an abbreviation). */
export function currentFields(shop: Bookstore): EditableFields {
  return {
    name: shop.name ?? '',
    street: shop.street ?? '',
    city: shop.city ?? '',
    state: getStateAbbrev(shop.state),
    zip: shop.zip ?? '',
    phone: shop.phone ?? '',
    website: shop.website ?? '',
    description: shop.description ?? '',
    featureIds: [...(shop.featureIds ?? [])].sort((a, b) => a - b),
  };
}

/** Collapse whitespace; compare states and phone numbers by their meaningful parts. */
function comparable(field: keyof EditableFields, value: string): string {
  const v = value.replace(/\s+/g, ' ').trim();
  if (field === 'state') return getStateAbbrev(v);
  if (field === 'phone') return v.replace(/\D/g, '');
  if (field === 'website') return v.replace(/\/+$/, '').toLowerCase();
  return v;
}

/** Fields whose suggested value differs from the current one, as before/after text. */
export function diffFields(
  current: EditableFields,
  suggested: EditableFields,
  featureName: (id: number) => string = id => `#${id}`
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of Object.keys(LABELS) as Array<keyof EditableFields>) {
    if (field === 'featureIds') {
      const before = [...current.featureIds].sort((a, b) => a - b);
      const after = [...suggested.featureIds].sort((a, b) => a - b);
      if (before.join(',') !== after.join(',')) {
        changes.push({ field: LABELS.featureIds, before: before.map(featureName).join(', ') || '—', after: after.map(featureName).join(', ') || '—' });
      }
      continue;
    }
    const before = current[field];
    const after = suggested[field];
    if (comparable(field, before) !== comparable(field, after)) {
      changes.push({ field: LABELS[field], before: before.trim() || '—', after: after.trim() || '—' });
    }
  }
  return changes;
}
