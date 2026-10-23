/**
 * Intro paragraphs for the /bookshops location pages, generated from the data
 * with plain templates (no AI). Also used as the meta description.
 */

import type { Bookstore, Feature } from '@/shared/schema';
import type { CityLocation, CountyLocation, StateLocation } from './location-index';
import type { FeaturePage, StateFeaturePage } from './feature-index';
import { countyToSlug } from './location-slugs';

/** "A", "A and B", "A, B and C". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function shopCount(n: number): string {
  return n === 1 ? 'one independent bookshop' : `${n.toLocaleString('en-US')} independent bookshops`;
}

/**
 * "3 have a café and 2 sell used books." when the Features tab has a coffee or
 * used-books feature and shops are tagged with it; '' otherwise.
 */
export function featureSentence(shops: Bookstore[], features: Feature[]): string {
  const idFor = (pattern: RegExp) => features.find(f => pattern.test(f.name))?.id;
  const count = (id: number | undefined) =>
    id === undefined ? 0 : shops.filter(s => s.featureIds?.includes(id)).length;
  const cafe = count(idFor(/coffee|caf[eé]/i));
  const used = count(idFor(/used/i));
  const parts = [
    cafe ? `${cafe} ${cafe === 1 ? 'has' : 'have'} a café` : '',
    used ? `${used} ${used === 1 ? 'sells' : 'sell'} used books` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  const sentence = joinList(parts);
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function withFeatures(text: string, shops: Bookstore[], features: Feature[]): string {
  const extra = featureSentence(shops, features);
  return extra ? `${text} ${extra}` : text;
}

export function stateIntro(state: StateLocation, features: Feature[] = []): string {
  const n = state.shops.length;
  // Only cities with more than one shop count as "the most"
  const top = state.cities.filter(c => c.shops.length > 1).slice(0, 3);
  let text = `${state.name} has ${shopCount(n)} in the IndieBookShop directory`;
  if (state.cities.length === 1) {
    text += `, all in ${state.cities[0].name}.`;
  } else {
    text += `, across ${state.cities.length} cities and towns.`;
    if (top.length) text += ` The most are in ${joinList(top.map(c => `${c.name} (${c.shops.length})`))}.`;
  }
  return withFeatures(text, state.shops, features);
}

/** Other cities in the same county as `city`, most shops first. */
export function countyNeighbours(state: StateLocation, city: CityLocation, limit = 3): string[] {
  if (!city.county) return [];
  const county = state.countiesBySlug[countyToSlug(city.county)];
  return county ? county.cityNames.filter(name => name !== city.name).slice(0, limit) : [];
}

export function cityIntro(state: StateLocation, city: CityLocation, features: Feature[] = []): string {
  const n = city.shops.length;
  let text =
    n === 1
      ? `${city.name}, ${state.name} has one independent bookshop: ${city.shops[0].name}.`
      : `${city.name}, ${state.name} has ${shopCount(n)}.`;
  const neighbours = countyNeighbours(state, city);
  if (neighbours.length && city.county) {
    const county = state.countiesBySlug[countyToSlug(city.county)];
    text += ` Elsewhere in ${county?.displayName ?? city.county}, there are shops in ${joinList(neighbours)}.`;
  }
  return withFeatures(text, city.shops, features);
}

export function countyIntro(state: StateLocation, county: CountyLocation, features: Feature[] = []): string {
  const n = county.shops.length;
  const towns = county.cityNames;
  let text = `${county.displayName}, ${state.name} has ${shopCount(n)}`;
  if (towns.length === 1) text += `, in ${towns[0]}.`;
  else if (towns.length <= 3) text += ` in ${joinList(towns)}.`;
  else text += ` across ${towns.length} towns, including ${joinList(towns.slice(0, 3))}.`;
  return withFeatures(text, county.shops, features);
}

/** Cuts an intro to a meta description length at a word boundary. */
export function toMetaDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function featureIntro(feature: FeaturePage): string {
  const n = feature.shops.length;
  const top = feature.states.slice(0, 3);
  let text = `${shopCount(n).replace(/^one/, 'One')} in the IndieBookShop directory ${n === 1 ? 'has' : 'have'} ${feature.phrase.toLowerCase()}`;
  if (feature.states.length === 1) text += `, all in ${top[0].stateName}.`;
  else text += `, across ${feature.states.length} states. The most are in ${joinList(top.map(s => `${s.stateName} (${s.shops.length})`))}.`;
  return text;
}

export function stateFeatureIntro(page: StateFeaturePage, state: StateLocation): string {
  const n = page.shops.length;
  const cities = new Map<string, number>();
  for (const shop of page.shops) cities.set(shop.city, (cities.get(shop.city) ?? 0) + 1);
  const top = [...cities].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([c]) => c);
  return `${n} of the ${state.shops.length.toLocaleString('en-US')} independent bookshops in ${state.name} ${n === 1 ? 'has' : 'have'} ${page.feature.phrase.toLowerCase()}, in ${joinList(top)}${cities.size > 3 ? ' and more' : ''}.`;
}
