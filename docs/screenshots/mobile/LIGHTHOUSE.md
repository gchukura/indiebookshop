# Mobile pass: audit and Lighthouse

Measured 2026-10-23 on the same machine against `next start` production builds: **before** = `main` at `6e66fdf`, **after** = `design/mobile`. Screenshots (iPhone 14 viewport, 390×844; saved at 1× and cropped to the first ~4 screens) are in `before/` and `after/`, produced by `node scripts/mobile-audit.mjs <base-url> <out-dir>`.

## Lighthouse (mobile, median of 3 runs)

Lighthouse 12.8.2, default mobile emulation (simulated slow 4G, 4× CPU slowdown), headless Chrome for Testing.

| Page | Performance | Accessibility | SEO |
|---|---|---|---|
| `/` | 75 → **94** | 86 → **100** | 100 → **100** |
| `/bookshops/california/san-francisco` | 72 → **91** | 86 → **100** | 100 → **100** |
| `/bookshop/parnassus-books` | 75 → **85** | 84 → **100** | 100 → **100** |

| Page | LCP | CLS | TBT | FCP |
|---|---|---|---|---|
| `/` | 3.7s → 3.1s | 0.303 → 0.000 | 4ms → 3ms | 0.9s → 1.1s |
| City | 3.2s → 3.4s | 0.303 → 0.000 | 91ms → 82ms | 1.4s → 1.7s |
| Shop | 7.0s → 4.4s | 0.018 → 0.016 | 148ms → 7ms | 0.9s → 1.5s |

What moved the numbers:

- **Removed `app/loading.tsx`** (and the shop page's). Its Suspense boundary made even prerendered pages stream a "Loading…" fallback and swap the content in with a script: the footer jumped down (CLS 0.30), and the LCP headline waited ~3s on that swap. It also turned redirects into 200 + meta refresh and not-found pages into soft 404s; those now return real 308 / 404.
- **Contrast**: white on the brand orange is 3.25:1. Buttons and shadcn's `accent` now use `--brand-orange-strong` `#C2552A` (4.54:1); the brand orange stays for accents. Count labels no longer use `opacity-75` on cream.
- **Shop page LCP**: the hero photo loaded lazily and competed with the 429 KB Mapbox chunk. It now loads eagerly with `fetchpriority="high"` and a `srcset`, and the map loads only when scrolled near.
- **Accessibility**: the logo link's name no longer contradicts its visible SVG text, star ratings have `role="img"`, and every interactive element is at least 44px (below).

### Not at 90 yet: shop page performance (85)

The photo now starts loading immediately (no load delay); what remains is ~3.7s of simulated transfer on slow 4G, with render-blocking CSS (~0.7s est.) on top. Lighthouse's emulated phone needs more than 400px, so `srcset` picks the 1200px file — we only have 400 and 1200. Next steps, in order of payoff:

1. Add an 800px variant next to each photo in R2 (resize the existing 1200px files — no Google calls) and include it in the `srcset`.
2. Inline the critical CSS or split it per route (Next's `experimental.inlineCss`), removing the render-blocking request.

## Mobile audit (scripts/mobile-audit.mjs)

Checks per page: horizontal overflow, tap targets < 44px (inline links inside running text exempt, as in WCAG), text < 14px (captions exempt), layout shift, and images without dimensions.

No page overflowed horizontally and every image already sat in an aspect-ratio box, before and after. (The site doesn't use `next/image`, so there are no `sizes` props to set; photos are plain `<img>` in fixed-ratio wrappers.)

| Page | Height (px) | Tap targets < 44px | Text < 14px |
|---|---|---|---|
| home | 8,450 → 8,891 | 89 → 0 | 7 → 0 |
| bookshops | 2,902 → 2,986 | 13 → 0 | 0 → 0 |
| state | 69,558 → 70,379 | 401 → 0 | 115 → 0 |
| city | 3,979 → 4,144 | 33 → 0 | 1 → 0 |
| feature | 254,554 → 257,580 | 1564 → 0 | 884 → 0 |
| shop | 7,593 → 7,855 | 33 → 0 | 10 → 0 |
| directory | 310,034 → 10,097 | 3250 → 0 | 1742 → 0 |
| directory-ca | 23,764 → 9,703 | 254 → 0 | 121 → 0 |
| search | 42,568 → 42,830 | 199 → 0 | 88 → 0 |
| near-me | 8,395 → 8,585 | 45 → 0 | 12 → 0 |
| events | 1,653 → 1,729 | 14 → 0 | 0 → 0 |
| blog | 1,653 → 1,729 | 14 → 0 | 0 → 0 |
| submit | 5,093 → 5,213 | 27 → 3 | 0 → 0 |
| contact | 3,362 → 3,498 | 17 → 0 | 2 → 0 |
| about | 6,425 → 6,501 | 12 → 0 | 0 → 0 |

Remaining 3 on `/submit`: the form's two radio buttons (16px) and the "physical store" switch (24px tall). Each sits in a full-width labelled row that is itself clickable, so the real target is the row.

## What changed for phones

1. **Header**: 56px tall with a 40px logo (cropped to its artwork so the wordmark stays legible), a 44×44 menu button, and a search icon.
2. **Directory**: the page scrolls normally; a sticky bar under the header holds List/Map, **Filters (n)** (a bottom sheet with the location and feature filters), search, and Near me. The map gets its own screen-height box only in Map view, so it can't capture touches meant for the list. The list renders 60 shops at a time with "Show more" (2,165 at once made the page 310,000px tall); the map still shows every match, and tapping a pin reveals its card.
3. **Tap targets**: shop cards are one big link (the title link stretches over the card; feature chips on cards are labels), and breadcrumbs, place lists, footer links, chips, radius buttons, inputs, selects, and buttons are all ≥ 44px.
4. **Text**: chips, review dates, and form notes went from 12px to 14px.
5. **URLs**: `proxy.ts` 308-redirects mixed-case `/bookshop/…` and `/bookshops/…` URLs to lowercase before rendering.
