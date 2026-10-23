# Ads (Google AdSense)

Ads are **off by default**. With the flag off, pages contain no ad markup and the AdSense script never loads.

## Turning ads on

1. In AdSense, approve `indiebookshop.com`. `public/ads.txt` already lists publisher `pub-4357894821158922`, and with the flag on every page carries the `google-adsense-account` meta tag and the AdSense script, both of which AdSense accepts for site verification.
2. Create four display ad units and copy their ids (the `data-ad-slot` numbers):

   | Env var | Slot name | Where it renders | Size |
   |---|---|---|---|
   | `NEXT_PUBLIC_ADSENSE_SLOT_LOCATION_INTRO` | `location-intro` | State, city, county, feature, and state + feature pages, right after the intro box. Not lazy (first ad on the page) | full width × 280px |
   | `NEXT_PUBLIC_ADSENSE_SLOT_LOCATION_LIST` | `location-list` | Same pages, a full-width row after every 10 shop cards (counting continues across the feature page's state groups; never after the last card). Lazy | full width × 280px |
   | `NEXT_PUBLIC_ADSENSE_SLOT_SHOP_INLINE` | `shop-inline` | Shop page, after About (on phones that's between About and Hours). Not lazy | full width × 280px |
   | `NEXT_PUBLIC_ADSENSE_SLOT_SHOP_RAIL` | `shop-rail` | Shop page, sticky in the right rail, at the bottom of the sidebar, on screens ≥ 1024px only. Lazy | 300 × 600 (fixed-size unit) |

3. In Vercel, set `NEXT_PUBLIC_ADSENSE_ENABLED=true` and the four slot vars, then **redeploy**. `NEXT_PUBLIC_` vars are inlined at build time, so changing them needs a new build.

No ads appear on the homepage, directory, search, near-me, events, blog, or any form page.

## How it works

- `lib/ads.ts` holds the publisher id, `ADS_ENABLED`, the slot ids, and `CARDS_PER_LIST_AD` (10).
- `app/layout.tsx` loads `adsbygoogle.js` with `next/script` `strategy="lazyOnload"` (after the page is idle) only when `ADS_ENABLED`.
- `components/ads/AdSlot.tsx` (client) is the one ad component:
  - It draws an "Advertisement" label and a box of **fixed** height (280px, or 300×600 for the rail). A filled, unfilled, or slow ad never changes the layout, so it can't add layout shift.
  - Lazy slots render their `<ins>` and push to `adsbygoogle` only when within 200px of the viewport (IntersectionObserver).
  - A slot whose id env var is empty shows the reserved box but requests nothing.
- Pages render `AdSlot` only inside `ADS_ENABLED && …`, so turning ads off removes the boxes too.

## Measured impact

Lighthouse 12.8.2, mobile, median of 3 runs, local `next start`, with Playwright's headless-shell Chromium (so the numbers don't compare with `docs/screenshots/mobile/LIGHTHOUSE.md`). "On" is `NEXT_PUBLIC_ADSENSE_ENABLED=true` without slot ids: the reserved boxes render and `adsbygoogle.js` loads.

| Page | Flag | Performance | Accessibility | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/bookshops/california/san-francisco` | off | 98 | 96* | 100 | 2.3s | 0.000 | 79ms |
| | on | 98 | 96* | 100 | 2.3s | 0.000 | 96ms |
| `/bookshop/parnassus-books` | off | 85 | 100 | 100 | 4.4s | 0.016 | 2ms |
| | on | 85 | 100 | 100 | 4.4s | 0.016 | 35ms |

\* The map's "Loading map…" text (gray-500 on cream, 4.36:1) stays visible because headless-shell Chromium has no WebGL. It's fixed in this branch (gray-600).

The script loads after the page is idle, so LCP and CLS don't change. It adds 17–33ms of TBT. Real ads add more third-party JavaScript once they fill, so expect TBT, and possibly performance, to drop somewhat in production. CLS can't rise from the slots, because every box has a fixed size.

## Notes

- **Turn Auto ads off** in AdSense (Ads → By site → indiebookshop.com) before enabling the flag. The script is loaded site-wide, and with no slot ids configured it still requested ads (`googleads.g.doubleclick.net/pagead/ads?client=…`) during testing, which means Auto ads (or overlay formats like anchor/vignette) are on for the account. Left on, Google would place ads on the homepage, directory, and forms too, and those ads aren't in reserved boxes, so they can shift the layout.
- The feature page lists every shop with a feature (up to ~580), so it gets an in-list ad every 10 cards: up to ~58 lazy slots. If that feels heavy, raise `CARDS_PER_LIST_AD` or cap the count.
- Unfilled slots keep their reserved space (an empty cream box). Collapsing them would cause layout shift.
- When ads are on, add a privacy policy that mentions AdSense cookies. For EEA/UK/Swiss visitors, Google requires a certified consent banner (AdSense → Privacy & messaging). Neither exists yet.
