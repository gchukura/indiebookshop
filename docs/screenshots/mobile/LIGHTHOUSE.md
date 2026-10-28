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

### Shop page to 90 (2026-10-28)

The shop page stayed at 85 after the mobile pass. A follow-up (`perf/shop-page-lcp`) measured each change on its own, using the same setup (median of 3 runs, Lighthouse 12.8.2, mobile):

| Step | `/` | City | Shop | Shop LCP | Shop FCP |
|---|---|---|---|---|---|
| Baseline (`main`) | 93 | 91 | 85 | 4.4s | 1.5s |
| 800px photo in the hero `srcset` | 94 | 92 | 86 | 4.1s | 1.5s |
| `★`/`→` drawn as icons, not text | 94 | 93 | 89 | 3.8s | 0.9s |
| Open Sans not preloaded | **96** | **93** | **90** | 3.7s | 1.2s |
| *(tried, not kept)* `experimental.inlineCss` | 95 | 94 | 89 | 3.8s | 1.0s |

- **800px photos**: `scripts/add-photo-800.mjs` made a `-800.webp` next to all 2,055 photos in R2 (63 KB on average against 132 KB at 1200px); new photos get it from `fetch-google-photos.mjs`. The emulated phone now downloads 36 KB for Parnassus instead of the 1200px file.
- **Glyphs**: `★` on cards and the `→` after links made the browser fetch Open Sans's *symbols* and *math* subsets (69 KB) for one character each, competing with the photo. They're now lucide `Star`/`ArrowRight` icons. Avoid adding those characters (or other arrows, stars, and math symbols) as text.
- **Font preload**: Open Sans (body) is no longer preloaded, which keeps 42 KB out of the photo's way. Libre Baskerville (headings) still is. CLS stayed at 0.017.
- **Inline CSS** made the shop page's HTML 111 KB → 265 KB (the CSS also lands in the RSC payload) for no gain on that page, so it was left off.

### Less JavaScript on every page (2026-10-28)

The shop page's JavaScript was ~181 KB gzipped (not counting the legacy polyfills, which modern browsers skip). A source-map build showed ~125 KB of it is the React/Next runtime every page needs; ~33 KB was app code every page loaded but few used. `perf/shop-page-js` removed that:

- React Query and the toast system (`Providers` + `Toaster`) moved from the root layout to the two submission forms, the only users. The footer's newsletter form shows its result inline instead of as a toast.
- The phone menu (Radix Dialog, focus trap, scroll lock) is `components/MobileMenu.tsx`, loaded on the first tap of the menu button.

| | `/` | City | Shop | Shop LCP | Shop JS (Lighthouse transfer) |
|---|---|---|---|---|---|
| Before | 96 | 93 | 90 | 3.7s | 188 KB, 16 files |
| After | **96** | **96** | **91** | 3.5s | 157 KB, 13 files |

What's left is mostly that runtime (react-dom, the App Router client, the Turbopack runtime) plus `tailwind-merge` (~7 KB, via `cn()` in `Button`).

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
