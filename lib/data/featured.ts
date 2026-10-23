import type { Bookstore } from '@/shared/schema';

/** Days since the Unix epoch (UTC); the featured selection changes when this does. */
export function daysSinceEpoch(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

/** Small deterministic PRNG (mulberry32) so the same seed gives the same picks. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const FEATURED_MIN_RATING = 4.5;

/**
 * Deterministic featured selection for a given day: shops rated ≥ 4.5 with a
 * photo first, then other ≥ 4.5 shops, then any shop, each tier shuffled by `day`.
 */
export function pickFeaturedBookstores(all: Bookstore[], count: number, day: number): Bookstore[] {
  const byId = [...all].sort((a, b) => a.id - b.id); // stable input order
  const highlyRated = (b: Bookstore) => parseFloat(b.googleRating || '0') >= FEATURED_MIN_RATING;
  const tiers = [
    byId.filter(b => highlyRated(b) && b.imageUrl),
    byId.filter(b => highlyRated(b) && !b.imageUrl),
    byId.filter(b => !highlyRated(b)),
  ];
  const picked: Bookstore[] = [];
  for (const tier of tiers) {
    if (picked.length >= count) break;
    picked.push(...seededShuffle(tier, day).slice(0, count - picked.length));
  }
  return picked;
}
