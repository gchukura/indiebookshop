/**
 * Server getter for the /bookshops/features pages, built from the processed
 * listing data (byFeature) plus the cached Features tab. No extra Sheets reads.
 */

import { cache } from 'react';
import { getProcessedBookstoreData } from './bookstore-data';
import { getFeatureNames, getLocationIndex } from './locations';
import { buildFeatureIndex, featureLinks, type FeatureIndex, type FeatureLink } from './feature-index';

export const getFeatureIndex = cache(
  async (): Promise<{ index: FeatureIndex; links: Record<number, FeatureLink> }> => {
    const [data, locations, { features }] = await Promise.all([
      getProcessedBookstoreData(),
      getLocationIndex(),
      getFeatureNames(),
    ]);
    const index = buildFeatureIndex(features, data.byFeature, locations);
    return { index, links: featureLinks(features, index) };
  }
);
