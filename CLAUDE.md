# CLAUDE.md — indiebookshop.com

Directory of ~3,000 US independent bookshops. The live app is **Next.js 16 App Router** (React 18, Tailwind 3, shadcn/Radix UI), deployed on Vercel. Data comes from a **Google Sheet** — there is no database.

## Do not touch (pending cleanup)
- `scripts/archive/` — old Supabase, Vercel Blob, and Vite-era scripts, kept for reference only. They don't run against the current setup.
- Root report `*.md` files (legacy notes).

## Commands
- `npm run dev` — dev server
- `npm run build` (= `next build`; needs Sheet credentials, it fetches data and prerenders every shop)
- `npm run start` — serve the build
- Type-check: `npm run check` (`tsc -p tsconfig.json --noEmit`)
- `node scripts/fetch-google-photos.mjs` — fetch Google photos into R2 for shops that lack one (see Photos below)
- `npx tsx scripts/test-interactive-elements.ts [url]` — Playwright smoke test of buttons, search, and forms
- `npm test` — Vitest unit tests in `tests/` (`vitest.config.ts` maps `@/`). No linter configured yet.

## Env vars (`.env.local`)
| Var | Used by | Required |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | `lib/google-sheets-client.ts` — single-line JSON with `client_email`, `private_key` | yes |
| `GOOGLE_SHEETS_ID` | Sheet id (falls back to a hard-coded id) | recommended |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (or `MAPBOX_ACCESS_TOKEN`) | `lib/mapbox.ts#getMapboxToken()`, read on the server and passed as a prop to every map | for maps |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | contact, submit, events emails | for forms |
| `R2_PUBLIC_URL` | `next.config.mjs` rewrite `/photos/*` → R2 bucket (build time) | for photos |
| `GOOGLE_PLACES_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | `scripts/fetch-google-photos.mjs` only (run locally) | no |
| `NEXT_PUBLIC_BASE_URL` | only `lib/seo-utils.ts` (currently unused) | no |

## Routes
| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | server, `revalidate=3600`: hero with `components/home/HeroSearch.tsx` (client; suggestions from `/api/suggest`, free text → `/directory?q=`, "Use my location" → `/directory?lat=&lng=`), featured this week (`getFeaturedBookstores(6, 'week')`), states with counts, feature chips, top rated, owner/event CTAs |
| `/directory` | `app/directory/page.tsx` + `DirectoryClient.tsx` | server page sends every shop (slim fields + `featureIds`), the features list, and the Mapbox token; the client filters by `?state&city&county&features&q` and sorts by distance with `?lat&lng` (features = shops with all selected) and keeps the URL in sync with `history.replaceState` (not `router.replace`, which would refetch the payload). The map (`components/directory/DirectoryMap.tsx`) is `next/dynamic` and loads only when its area is visible (desktop, or after tapping Map on mobile) |
| `/bookshops`, `/bookshops/[state]`, `/bookshops/[state]/[city]`, `/bookshops/[state]/county/[county]` | `app/bookshops/**/page.tsx` | server-rendered location pages (US states + DC only), all params via `generateStaticParams`, `dynamicParams=false`, `revalidate=3600`. Data from `getLocationIndex()` (`lib/data/locations.ts` → `lib/data/location-index.ts`); slugs from `lib/data/location-slugs.ts`; intro text from `lib/data/location-content.ts`. UI in `components/location/` and `components/bookshop/` (`BookshopCard`, `LazyShopsMap`) |
| `/bookshops/features`, `/bookshops/features/[feature]`, `/bookshops/[state]/features/[feature]` | `app/bookshops/features/**`, `app/bookshops/[state]/features/[feature]/page.tsx` | feature pages from `getFeatureIndex()` (`lib/data/features.ts` → `lib/data/feature-index.ts`): a feature gets a page at ≥3 US shops, a state + feature page at ≥3 shops in that state. Same components as location pages; the feature page groups shops by state with a jump list. `dynamicParams=false`, so a new feature/state/city only gets a page on the next deploy |
| `/bookshop/[slug]` | `app/bookshop/[slug]/page.tsx` → `components/bookshop/ShopDetail.tsx` (server) | all slugs via `generateStaticParams`, `dynamicParams=true`, `revalidate=86400`; non-canonical slug → `permanentRedirect`. Client islands only: `PhotoGallery`, `LazyShopMap` → `ShopMap` (Mapbox), and `ShopHours` (`OpenStatusBadge`/`HoursTable` read the current time in the shop's zone from `lib/data/timezones.ts` after mount, since the page is static). Nearby = 6 nearest by distance (`lib/data/nearby.ts`); events from the cached Events tab (`getUpcomingEvents`) |
| `/about`, `/blog` | static server pages | blog is a placeholder |
| `/events` | `app/events/page.tsx` (`'use client'`) + `EventsClient.tsx` | fetches `GET /api/events` and `/api/bookstores`, neither exists (only `POST /api/events`) |
| `/submit`, `/submit-event`, `/contact` | client pages with forms | |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | static pages, `/bookshops` pages (state 0.8 / city 0.7 / county 0.6), and every shop |
| `not-found`, `error`, `loading` | `app/*.tsx` | |

API (`app/api/`): `bookstores/filter` (GET, listing data), `bookstores/submit` (POST → SendGrid), `bookstores/[id]/events` (GET), `events` (POST → SendGrid), `contact` (POST → `lib/contact-email.ts`), `newsletter-signup` (POST → appends to Sheet "Newsletter" tab), `features` (GET), `suggest` (GET `?q=` → up to 8 states/cities/shops from `lib/data/suggest.ts`, CDN-cached). (`/api/config` was removed — maps get the token as a prop.)

Redirects: `next.config.mjs` maps `/bookstore/:id`, `/submit-bookshop`, `/directory/category/...`. The old `/directory/state/:state`, `/directory/city/[:state/]:city`, `/directory/county/:state/:county` URLs are route handlers in `app/directory/{state,city,county}/` (308 to the `/bookshops` page, via `lib/data/legacy-location-redirect.ts`), because they hold raw names like `CA` or `San Francisco`. `/directory?state=` is not redirected — the directory's own filters use it. `vercel.json` redirects apex → `www`.

## Data flow
```
Google Sheet (tabs: Bookstores, Features, Events, Newsletter)
  → lib/google-sheets-client.ts   getBookstoresFromSheets(listingOnly), getFeaturesFromSheets, getEventsFromSheets, appendNewsletterSignup
  → lib/data/bookstore-data.ts    caches + processBookstoreData → indexes
  → server pages / API routes     (client components get data as props or via /api/*)
```
- Each Bookstores row is mapped header → cell (`rowToRecord`) and parsed by the zod schema in `lib/data/bookstore-row.ts`. Blank rows and `live=false` rows are skipped silently. Rows with a missing/non-numeric id, no name, or a `#ERROR` value in name/city/state are skipped and logged once as `[GoogleSheets] skipped N invalid rows: …`. A malformed JSON or number cell just becomes null. The schema coerces `feature_ids` (`{1,2}`, `[1,2]` or `1,2`), JSON columns, numbers, and booleans, and turns `imageurl` into a `/photos/...` path.
- **Two caches, on purpose:**
  1. **Listing cache** — `getCachedRawBookstores = unstable_cache(getBookstoresFromSheets(true), revalidate 3600)`. Each record is `toListingBookstore(fullRow)`: only `LISTING_FIELDS` (id, name, slug, city, state, county, imageUrl, live, lat/lng, featureIds, googleRating, googleReviewCount) plus the description cut to 150 chars. Other fields are absent (undefined), not null. That keeps the payload ~0.75 MB, under Vercel's **2 MB unstable_cache entry limit**. It lives in Vercel's shared Data Cache, so it survives cold starts. `getProcessedBookstoreData()` (wrapped in React `cache()` plus a 1h module-level memo) builds on this and powers home, directory, sitemap, filter API, related shops.
  2. **Full cache** — `fetchFullBookstoreData()` calls `getBookstoresFromSheets(false)` and keeps all columns in a module-level variable (1h TTL). No size limit, but per-Lambda: a cold detail-page render fetches the whole Sheet. Used only by `getBookstoreBySlugFull` and `getBookstoreById` (detail pages).
- Build-time Sheets quota: prerendering ~4,400 pages can exceed the per-minute read quota. During `next build` only, `lib/google-sheets-client.ts` retries a 429 after 20s and 40s, and `next.config.mjs` sets `staticPageGenerationTimeout: 180` so a waiting page isn't timed out.
- Don't add detail fields to `LISTING_FIELDS` without measuring the payload — the limit is 2 MB. Detail data must come from the full cache.
- `ProcessedBookstoreData` indexes: `byId`, `bySlug` (lowercased), `byState` (key = lowercase state abbrev), `byCity`/`byCounty` (key = `makeCityKey(place, state)` → `"<place>|<st>"` lowercased, from `lib/data/location-key.ts`), `byFeature` (feature id string), plus `popular` (top 15 by rating then review count). Nothing is shuffled.
- Featured: `getFeaturedBookstores` → `pickFeaturedBookstores` (`lib/data/featured.ts`), seeded by days since epoch (UTC), so it's stable within a day and rotates daily. Tiers: rating ≥ 4.5 with a photo, then other ≥ 4.5, then any.
- Slugs: `getBookstoreSlug(b)` / `generateSlugFromName(name)` in `lib/data/slug.ts` (the only copy). State conversion: `lib/state-utils.ts` only (`getStateAbbrev`, `getStateDisplayName`, `US_STATE_NAMES`).
- Photos (see `docs/PHOTO_PIPELINE.md`): one Google photo per shop, fetched once by `scripts/fetch-google-photos.mjs` into R2 as `photos/<id>-<hash>.webp` (1200px) plus `-400.webp`. The Sheet's `imageurl` holds the r2.dev URL; the Sheets client turns it into a same-origin `/photos/...` path (served via the rewrite) and drops any other host. `photo_attribution`/`photo_attribution_url` hold the photographer credit shown on detail pages. Shops without a photo get a generic placeholder from `public/placeholders/` picked by `id % 18`. In `lib/bookshop-image.ts`: `getBookshopImageUrl` (photo or placeholder, for display) and `getBookshopPhotoUrl` (real photo or null — use this for og:image and JSON-LD, never placeholders).

## Bookstore type
`Bookstore` is a plain TypeScript type in `shared/schema.ts`. `Feature`, `Event`, and zod `insert*Schema`s live there too. Fields and their Sheet columns (`Bookstores` tab):
- Core: `id`, `name`, `slug`, `street`, `city`, `state`, `zip`, `county`, `description`, `imageUrl` (`imageurl`), `photoAttribution`, `photoAttributionUrl`, `website`, `phone`, `live`
- Location: `latitude`/`longitude` — strings, from `lat_numeric`/`lng_numeric`, else `latitude`/`longitude`
- `featureIds` (`feature_ids`, JSON like `[1,2]`) → ids in the `Features` tab (only `id`, `name` columns exist; slugs come from the name). Tags were first proposed by `scripts/tag-features.ts` (from Google types, descriptions, reviews) and reviewed before writing. Chips (`components/bookshop/FeatureChips.tsx`) show on cards and detail pages, linking to the feature page when one exists
- Google Places enrichment: `googlePlaceId`, `googleRating` (string), `googleReviewCount`, `googleDescription`, `googleReviews` (JSON), `googlePriceLevel`, `googleDataUpdatedAt`, `googleMapsUrl`, `googleTypes` (JSON), `formattedAddressGoogle`, `businessStatus`, `formattedPhone`, `websiteVerified`, `contactDataFetchedAt`
- Hours: `openingHoursJson` from `opening_hours_json` (`{ open_now, weekday_text[], periods[] }`)
- AI copy: `aiGeneratedDescription`, `descriptionSource`, `descriptionGeneratedAt`, `descriptionValidated`
- Description priority: `getBookstoreDescription(b)` in `lib/data/bookstore-content.ts` → `{ text, source }`: `description` → `googleDescription` → validated `aiGeneratedDescription` → template. Metadata uses the text; the detail page and the JSON-LD leave out `source: 'template'`.

`Event` (`Events` tab): `id, bookshopId, title, description, date, time`.

## Key files
- `components/Header.tsx`, `Footer.tsx` (client; footer posts the newsletter form), `Logo.tsx`
- `components/StructuredData.tsx` — JSON-LD (`LocalBusinessSchema`, `BreadcrumbSchema`, etc.)
- `components/bookshop/BookshopCard.tsx` — the one shop card (`size="compact"` for lists, optional `distanceMiles`); used by home, directory, location/feature pages, and nearby lists
- `components/BookshopImage.tsx`, forms `BookshopSubmissionForm.tsx`, `EventSubmissionForm.tsx`
- `components/ui/` — shadcn primitives. `components/Providers.tsx` wraps the app in React Query (`lib/queryClient.ts`); used by the events page and the two forms.
- Imported by nothing (candidates for removal): `components/StateFlag.tsx`, `components/ads/*` (AdSense, not rendered).

## Brand
- Colors: brown `#5F4B32` (headings), teal `#2A6B7C` (primary actions), orange `#E16D3D` (accent/CTAs), cream `#F7F3E8` (section backgrounds), with hover shades for teal and orange.
- Tokens: `app/globals.css` defines `--brand-brown`, `--brand-teal(-hover)`, `--brand-orange(-hover)`, `--brand-cream` (RGB channels) and maps the shadcn theme to them: `primary` = teal, `accent` = orange, `secondary` = brown, `muted` = cream, `border`/`input` = warm gray, `ring` = teal, `--radius` = 0.75rem. `.dark` is still shadcn's default.
- Tailwind classes: `text-brand-brown`, `bg-brand-teal hover:bg-brand-teal-hover`, `bg-brand-orange hover:bg-brand-orange-hover`, `bg-brand-cream`, and opacity forms like `bg-brand-teal/5`. Hex values are only allowed where a class can't be used (Mapbox paint colors → `lib/constants.ts` `COLORS`; `app/icon.svg`).
- Buttons (`components/ui/button.tsx`): `variant="default"` is the teal pill, `variant="accent"` the orange pill; `outline`/`ghost` hover to cream. For a link styled as a button use `cn(buttonVariants({ variant }), …)`. `cn()` knows the custom type scale, so `text-lg` overrides `text-body`.
- Layout: `.container-site` (max-w-6xl, responsive side padding) for page sections.
- Fonts: Libre Baskerville (`font-serif`, headings) and Open Sans (`font-sans`, body), loaded with `next/font` in `app/layout.tsx`.
- Type scale tokens in tailwind: `text-display`, `text-h1`…`text-h4`, `text-body-lg`, `text-body`, `text-body-sm`, `text-label`, `text-meta`.

## Conventions
- Server components by default. Use `'use client'` only for interactive islands (maps, forms, filters, menus), and pass data down as props instead of fetching after mount.
- Import data through `@/lib/data/bookstore-data`, never call the Sheets client from pages directly (except events/features until they get cached getters).
- Path aliases: `@/*` → repo root, `@shared/*` → `shared/`.
- Once brand tokens exist in `globals.css`/`tailwind.config.ts`, no new hard-coded hex colors. Use the token classes.
- Mapbox/`mapbox-gl` is ~1.6 MB, so load map components with `next/dynamic({ ssr: false })` — never a static import, or it also loads on every page that prefetches a link to that route.
- Keep the 2 MB `unstable_cache` limit in mind for anything you cache.
- Before you finish, run `npm run check`, `npm test`, and `npm run build`.
