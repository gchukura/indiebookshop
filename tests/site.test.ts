/**
 * Site-level checks against the fixture (tests/fixtures/bookstores.json):
 * slugs, indexes, featured selection, sitemap vs. generated pages, title length.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Metadata } from 'next';
import { STATE_ABBREV_TO_FULL } from '@/lib/state-utils';
import { cityToSlug, slugToState, stateToSlug } from '@/lib/data/location-slugs';
import { getFeaturedBookstores, getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { getLocationIndex } from '@/lib/data/locations';
import { MAX_TITLE_LENGTH } from '@/lib/seo';

import sitemap from '@/app/sitemap';
import * as home from '@/app/page';
import * as bookshopsIndex from '@/app/bookshops/page';
import * as statePage from '@/app/bookshops/[state]/page';
import * as cityPage from '@/app/bookshops/[state]/[city]/page';
import * as countyPage from '@/app/bookshops/[state]/county/[county]/page';
import * as featuresIndex from '@/app/bookshops/features/page';
import * as featurePage from '@/app/bookshops/features/[feature]/page';
import * as stateFeaturePage from '@/app/bookshops/[state]/features/[feature]/page';
import * as shopPage from '@/app/bookshop/[slug]/page';
import * as blogIndex from '@/app/blog/page';
import * as blogPost from '@/app/blog/[slug]/page';
import * as events from '@/app/events/page';

const SITE = 'https://www.indiebookshop.com';
const TEMPLATE = '%s | IndieBookShop'; // app/layout.tsx title.template

describe('location slugs', () => {
  it('round-trip for every state', () => {
    for (const abbrev of Object.keys(STATE_ABBREV_TO_FULL)) expect(slugToState(stateToSlug(abbrev))).toBe(abbrev);
  });

  it('resolve back to the 50 largest cities in the data', async () => {
    const { states } = await getLocationIndex();
    const largest = states.flatMap(s => s.cities.map(c => ({ s, c }))).sort((a, b) => b.c.shops.length - a.c.shops.length).slice(0, 50);
    expect(largest.length).toBeGreaterThanOrEqual(50);
    for (const { s, c } of largest) {
      expect(c.slug).toBe(cityToSlug(c.name));
      expect(s.citiesBySlug[cityToSlug(c.name)]).toBe(c);
    }
  });
});

describe('processed data', () => {
  it('state, city, and county indexes add up', async () => {
    const data = await getProcessedBookstoreData();
    const sum = (index: Record<string, unknown[]>) => Object.values(index).reduce((n, list) => n + list.length, 0);
    expect(data.totalCount).toBe(data.all.length);
    expect(sum(data.byState)).toBe(data.all.filter(b => b.state).length);
    expect(sum(data.byCity)).toBe(data.all.filter(b => b.city && b.state).length);
    expect(sum(data.byCounty)).toBe(data.all.filter(b => b.county && b.state).length);
    expect(Object.keys(data.bySlug).length).toBeGreaterThan(0);
  });

  it('featured selection is stable for a fixed date and changes on another', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    const a = (await getFeaturedBookstores(8)).map(b => b.id);
    const b = (await getFeaturedBookstores(8)).map(b => b.id);
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
    const later = (await getFeaturedBookstores(8)).map(b => b.id);
    vi.useRealTimers();
    expect(a).toHaveLength(8);
    expect(b).toEqual(a);
    expect(later).not.toEqual(a);
  });
});

/** Every path the app pre-generates, from each route's generateStaticParams. */
async function generatedPaths(): Promise<Set<string>> {
  const paths = new Set(['/', '/directory', '/about', '/contact', '/events', '/submit', '/submit-event', '/bookshops', '/bookshops/features', '/blog']);
  for (const p of await statePage.generateStaticParams()) paths.add(`/bookshops/${p.state}`);
  for (const p of await cityPage.generateStaticParams()) paths.add(`/bookshops/${p.state}/${p.city}`);
  for (const p of await countyPage.generateStaticParams()) paths.add(`/bookshops/${p.state}/county/${p.county}`);
  for (const p of await featurePage.generateStaticParams()) paths.add(`/bookshops/features/${p.feature}`);
  for (const p of await stateFeaturePage.generateStaticParams()) paths.add(`/bookshops/${p.state}/features/${p.feature}`);
  for (const p of await shopPage.generateStaticParams()) paths.add(`/bookshop/${p.slug}`);
  for (const p of await blogPost.generateStaticParams()) paths.add(`/blog/${p.slug}`);
  return paths;
}

describe('sitemap', () => {
  it('only lists pages the app generates', async () => {
    const [entries, paths] = await Promise.all([sitemap(), generatedPaths()]);
    expect(entries.length).toBeGreaterThan(200);
    const missing = entries.map(e => e.url.replace(SITE, '') || '/').filter(path => !paths.has(path));
    expect(missing).toEqual([]);
  });
});

/** The final <title>, applying the layout template to plain-string titles. */
function finalTitle(metadata: Metadata): string {
  const t = metadata.title;
  if (!t) return '';
  if (typeof t === 'string') return TEMPLATE.replace('%s', t);
  if ('absolute' in t && t.absolute) return t.absolute;
  return '';
}

describe('page titles', () => {
  it(`are at most ${MAX_TITLE_LENGTH} characters`, async () => {
    const titles: string[] = [];
    const add = (m: Metadata) => titles.push(finalTitle(m));
    const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

    add(await home.generateMetadata());
    add(await bookshopsIndex.generateMetadata());
    add(await featuresIndex.generateMetadata());
    add(blogIndex.metadata);
    add(events.metadata);
    for (const p of await statePage.generateStaticParams()) add(await statePage.generateMetadata(params(p)));
    for (const p of await cityPage.generateStaticParams()) add(await cityPage.generateMetadata(params(p)));
    for (const p of await countyPage.generateStaticParams()) add(await countyPage.generateMetadata(params(p)));
    for (const p of await featurePage.generateStaticParams()) add(await featurePage.generateMetadata(params(p)));
    for (const p of await stateFeaturePage.generateStaticParams()) add(await stateFeaturePage.generateMetadata(params(p)));
    for (const p of await shopPage.generateStaticParams()) add(await shopPage.generateMetadata(params(p)));
    for (const p of await blogPost.generateStaticParams()) add(await blogPost.generateMetadata(params(p)));

    expect(titles.length).toBeGreaterThan(300);
    expect(titles.filter(t => !t)).toEqual([]);
    expect(titles.filter(t => t.length > MAX_TITLE_LENGTH)).toEqual([]);
  });
});
