/**
 * AdSense configuration. Ads render only when NEXT_PUBLIC_ADSENSE_ENABLED=true
 * (read at build time); with the flag off the pages contain no ad markup at all.
 * Each slot's ad unit id comes from its own env var, created in the AdSense
 * account. See docs/ADS.md.
 */

export const ADSENSE_CLIENT = 'ca-pub-4357894821158922';

export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';

// Literal process.env reads so Next inlines them into the client bundle
const SLOT_IDS = {
  /** Location and feature pages, after the intro paragraph. */
  'location-intro': process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOCATION_INTRO,
  /** Location and feature pages, after every 10 shop cards. */
  'location-list': process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOCATION_LIST,
  /** Shop page, between About and Hours. */
  'shop-inline': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SHOP_INLINE,
  /** Shop page, sticky 300×600 in the right rail (≥1024px). */
  'shop-rail': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SHOP_RAIL,
} as const;

export type AdSlotName = keyof typeof SLOT_IDS;

/** The ad unit id for a slot, or undefined if it isn't configured. */
export function adSlotId(name: AdSlotName): string | undefined {
  return SLOT_IDS[name] || undefined;
}

/** Shop cards between in-list ads on location and feature pages. */
export const CARDS_PER_LIST_AD = 10;
