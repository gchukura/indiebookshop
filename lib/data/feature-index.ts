/**
 * Groups shops by feature (Features tab) for the /bookshops/features pages.
 * Pure (no data fetching); see lib/data/features.ts for the cached getter.
 */

import type { Bookstore, Feature } from '@/shared/schema';
import type { LocationIndex } from './location-index';
import { sortShops } from './location-index';
import { toLocationSlug } from './location-slugs';

/** A feature gets a page once this many shops have it; same for a state + feature page. */
export const MIN_FEATURE_SHOPS = 3;
export const MIN_STATE_FEATURE_SHOPS = 3;

export type FeatureStateGroup = {
  stateName: string;
  stateSlug: string;
  shops: Bookstore[];
};

export type FeaturePage = {
  id: number;
  name: string;
  slug: string;
  /** Reads after "with": "a Coffee Shop", "Used Books". */
  phrase: string;
  shops: Bookstore[];
  /** US states with this feature, most shops first. */
  states: FeatureStateGroup[];
};

export type StateFeaturePage = {
  feature: FeaturePage;
  stateName: string;
  stateSlug: string;
  shops: Bookstore[];
};

export type FeatureIndex = {
  /** Features with at least MIN_FEATURE_SHOPS shops, most shops first. */
  features: FeaturePage[];
  bySlug: Record<string, FeaturePage>;
  /** stateSlug → featureSlug → page, for combinations with at least MIN_STATE_FEATURE_SHOPS shops. */
  byState: Record<string, Record<string, StateFeaturePage>>;
};

export type FeatureLink = { name: string; href: string | null };

/** "Coffee Shop" → "a Coffee Shop", "Children's Section" → "a Children's Section", plurals unchanged. */
export function featurePhrase(name: string): string {
  return /(shop|section|cafe|café)$/i.test(name.trim()) ? `a ${name.trim()}` : name.trim();
}

export function featureSlug(name: string): string {
  return toLocationSlug(name);
}

export function buildFeatureIndex(
  features: Feature[],
  byFeature: Record<string, Bookstore[]>,
  locations: LocationIndex
): FeatureIndex {
  const pages: FeaturePage[] = [];
  const byState: FeatureIndex['byState'] = {};

  for (const f of features) {
    const ids = new Set((byFeature[String(f.id)] ?? []).map(s => s.id));
    if (ids.size < MIN_FEATURE_SHOPS) continue;
    const page: FeaturePage = {
      id: f.id,
      name: f.name,
      slug: featureSlug(f.name),
      phrase: featurePhrase(f.name),
      shops: [],
      states: [],
    };

    // US states only, matching the location pages the list links to
    for (const state of locations.states) {
      const stateShops = state.shops.filter(s => ids.has(s.id)); // already sorted
      if (!stateShops.length) continue;
      page.states.push({ stateName: state.name, stateSlug: state.slug, shops: stateShops });
      if (stateShops.length >= MIN_STATE_FEATURE_SHOPS) {
        (byState[state.slug] ??= {})[page.slug] = {
          feature: page,
          stateName: state.name,
          stateSlug: state.slug,
          shops: stateShops,
        };
      }
    }
    page.states.sort((a, b) => b.shops.length - a.shops.length || a.stateName.localeCompare(b.stateName));
    page.shops = sortShops(page.states.flatMap(g => g.shops));
    if (page.shops.length < MIN_FEATURE_SHOPS) continue;
    pages.push(page);
  }

  pages.sort((a, b) => b.shops.length - a.shops.length || a.name.localeCompare(b.name));
  return { features: pages, bySlug: Object.fromEntries(pages.map(p => [p.slug, p])), byState };
}

/** Feature id → chip label and feature page link (null when the feature has no page). */
export function featureLinks(features: Feature[], index: FeatureIndex): Record<number, FeatureLink> {
  return Object.fromEntries(
    features.map(f => {
      const page = index.bySlug[featureSlug(f.name)];
      return [f.id, { name: f.name, href: page ? `/bookshops/features/${page.slug}` : null }];
    })
  );
}
