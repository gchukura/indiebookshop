/**
 * Server getters for the /bookshops location pages. The index is built from
 * the processed listing data (byState / byCity / byCounty), so it costs no
 * extra Sheets reads; it's memoized per processed-data object.
 */

import { cache } from 'react';
import type { Feature } from '@/shared/schema';
import { getFeatures, getProcessedBookstoreData, type ProcessedBookstoreData } from './bookstore-data';
import { buildLocationIndex, type LocationIndex } from './location-index';

const indexes = new WeakMap<ProcessedBookstoreData, LocationIndex>();

export const getLocationIndex = cache(async (): Promise<LocationIndex> => {
  const data = await getProcessedBookstoreData();
  let index = indexes.get(data);
  if (!index) {
    index = buildLocationIndex(data);
    indexes.set(data, index);
  }
  return index;
});

/** Feature id → name for the card chips; empty if the Features tab can't be read. */
export async function getFeatureNames(): Promise<{ features: Feature[]; names: Record<number, string> }> {
  try {
    const features = await getFeatures();
    return { features, names: Object.fromEntries(features.map(f => [f.id, f.name])) };
  } catch (err) {
    console.error('[locations] Could not load features:', err);
    return { features: [], names: {} };
  }
}
