# CLAUDE.md — indiebookshop.com

Directory of ~3,000 US independent bookshops. The live app is **Next.js 16 App Router** (React 18, Tailwind 3, shadcn/Radix UI), deployed on Vercel. Data comes from a **Google Sheet** — there is no database.

## Do not touch (pending cleanup)
- `scripts/archive/` — old Supabase, Vercel Blob, and Vite-era scripts, kept for reference only. They don't run against the current setup.
- Root report `*.md` files (legacy notes).

## Commands
- `npm run dev` — dev server (runs `export-sheet` first)
- `npm run build` (= `next build`, after `prebuild` runs `export-sheet`; needs Sheet credentials, then prerenders every shop from the snapshot in ~30s)
- `npm run export-sheet` — `scripts/export-sheet.ts`: reads the Sheet once, checks it (`lib/data/sheet-snapshot.ts`), writes `.data/sheet.json` (gitignored). Skipped with `USE_FIXTURE_DATA=1`
- `npm run start` — serve the build
- Type-check: `npm run check` (`tsc -p tsconfig.json --noEmit`)
- `node scripts/fetch-google-photos.mjs` — fetch Google photos into R2 for shops that lack one (see Photos below)
- `node scripts/indexnow.mjs [--urls a,b | --diff <file>] [--dry-run]` — submit the live sitemap (or given paths, or only URLs added/removed since `<file>`) to IndexNow (Bing etc.); the key file is `public/acc33ef596bf47359e1aa5cd6b78344d.txt`. `.github/workflows/indexnow.yml` runs the `--diff` mode after every production deploy (and daily at 09:30 UTC), keeping the last URL list in the Actions cache
- `npx tsx scripts/test-interactive-elements.ts [url]` — Playwright smoke test of buttons, search, and forms
- `npm test` — Vitest unit tests in `tests/` (`vitest.config.ts` maps `@/`; `tests/setup.ts` turns on fixture data and stubs `unstable_cache`/React `cache`, so tests can import pages, the sitemap, and the data layer)
- `npm run lint` — ESLint 9 flat config (`eslint.config.mjs`, `eslint-config-next`); `next lint` no longer exists in Next 16. Errors fail CI, warnings don't
- `npm run test:e2e` — Playwright smoke tests (`e2e/`) against `next start`; run `npm run build` first
- `npx tsx scripts/export-fixture.ts` — refresh `tests/fixtures/bookstores.json` (200 real rows covering every state and the 50 biggest cities)
- CI: `.github/workflows/ci.yml` runs lint, check, test, build, and the smoke tests on PRs and pushes to main. It builds from the Sheet when the `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`/`GOOGLE_SHEETS_ID` repo secrets exist, else from the fixture

## Env vars (`.env.local`)
| Var | Used by | Required |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | `lib/google-sheets-client.ts` — single-line JSON with `client_email`, `private_key`. Read access at build (`export-sheet`); write access at runtime for the newsletter and submissions forms only | yes |
| `GOOGLE_SHEETS_ID` | Sheet id (falls back to a hard-coded id) | recommended |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (or `MAPBOX_ACCESS_TOKEN`) | `lib/mapbox.ts#getMapboxToken()`, read on the server and passed as a prop to every map | for maps |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | contact, submit, events emails | for forms |
| `R2_PUBLIC_URL` | `next.config.mjs` rewrite `/photos/*` → R2 bucket (build time) | for photos |
| `GOOGLE_PLACES_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | `scripts/fetch-google-photos.mjs` only (run locally) | no |
| `NEXT_PUBLIC_ADSENSE_ENABLED`, `NEXT_PUBLIC_ADSENSE_SLOT_{LOCATION_INTRO,LOCATION_LIST,SHOP_INLINE,SHOP_RAIL}` | `lib/ads.ts` (build time). Ads and the AdSense script render only when the flag is `true`; see `docs/ADS.md` | no |
| `USE_FIXTURE_DATA=1` | `lib/google-sheets-client.ts` reads `tests/fixtures/bookstores.json` instead of the snapshot (tests, CI without secrets, offline builds) | no |

## Routes
| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | server, `revalidate=3600`: hero with `components/search/SearchBox.tsx` (client; suggestions from `/api/suggest`, free text → `/search?q=`, "Use my location" → `/near-me?lat=&lng=`), featured this week (`getFeaturedBookstores(6, 'week')`), states with counts, feature chips, top rated, owner/event CTAs |
| `/directory` | `app/directory/page.tsx` + `DirectoryClient.tsx` | server page sends every shop (slim fields + `featureIds`), the features list, and the Mapbox token; the client filters by `?state&city&county&features&q` and sorts by distance with `?lat&lng` (features = shops with all selected) and keeps the URL in sync with `history.replaceState` (not `router.replace`, which would refetch the payload). The map (`components/directory/DirectoryMap.tsx`) is `next/dynamic` and loads only when its area is visible (desktop, or after tapping Map on mobile) |
| `/search` | `app/search/page.tsx` | server-rendered, `noindex`: up to 3 "Browse all bookshops in …" place links + up to 100 shops, from `lib/data/search.ts` |
| `/near-me` | `app/near-me/page.tsx` + `components/near-me/NearMeLocator.tsx` | `noindex`. With `?lat&lng&radius` (10/25/50/100, default 25): nearest 50 shops within the radius via `nearest()` in `lib/data/geo.ts`, else the closest 6. Without coordinates, the client island asks for geolocation (or a city → `/search`) |
| `/bookshops`, `/bookshops/[state]`, `/bookshops/[state]/[city]`, `/bookshops/[state]/county/[county]` | `app/bookshops/**/page.tsx` | server-rendered location pages (US states + DC only), all params via `generateStaticParams`, `dynamicParams=false`, `revalidate=3600`. Data from `getLocationIndex()` (`lib/data/locations.ts` → `lib/data/location-index.ts`); slugs from `lib/data/location-slugs.ts`; intro text from `lib/data/location-content.ts`. UI in `components/location/` and `components/bookshop/` (`BookshopCard`, `LazyShopsMap`) |
| `/bookshops/features`, `/bookshops/features/[feature]`, `/bookshops/[state]/features/[feature]` | `app/bookshops/features/**`, `app/bookshops/[state]/features/[feature]/page.tsx` | feature pages from `getFeatureIndex()` (`lib/data/features.ts` → `lib/data/feature-index.ts`): a feature gets a page at ≥3 US shops, a state + feature page at ≥3 shops in that state. Same components as location pages; the feature page groups shops by state with a jump list. `dynamicParams=false`, so a new feature/state/city only gets a page on the next deploy |
| `/bookshop/[slug]` | `app/bookshop/[slug]/page.tsx` → `components/bookshop/ShopDetail.tsx` (server) | all slugs via `generateStaticParams`, `dynamicParams=true`, `revalidate=86400`; non-canonical slug → `permanentRedirect`. Client islands only: `PhotoGallery`, `LazyShopMap` → `ShopMap` (Mapbox), and `ShopHours` (`OpenStatusBadge`/`HoursTable` read the current time in the shop's zone from `lib/data/timezones.ts` after mount, since the page is static). Nearby = 6 nearest by distance (`lib/data/nearby.ts`); events from the cached Events tab (`getUpcomingEvents`) |
| `/about` | static server page | |
| `/blog`, `/blog/[slug]` | `app/blog/**` + `lib/blog.ts` | MDX posts in `content/blog/*.mdx` (YAML frontmatter: title, date, description, slug, cover?) compiled with `next-mdx-remote/rsc` (bundled via `transpilePackages` so it uses Next's React). Invalid frontmatter fails the build. `/blog` 404s and the Header/Footer/About hide the Blog link when there are no posts (`hasBlogPosts()`). `Article` JSON-LD; posts are in the sitemap |
| `/events` | `app/events/page.tsx` (server, `revalidate=3600`) | upcoming events from the cached Events tab (`getAllUpcomingEvents`, helpers in `lib/data/events.ts`), grouped by day, linked to shops, `Event` JSON-LD per item; empty state links to `/submit-event`. The homepage shows the next 3 |
| `/submit` | `app/submit/page.tsx` (server) + `components/BookshopSubmissionForm.tsx` | `?edit=<slug>` → "Suggest an edit for {name}", prefilled, posts `mode=edit` + `bookshopId` |
| `/submit-event`, `/contact` | client pages with forms | |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | static pages, `/bookshops` pages (state 0.8 / city 0.7 / county 0.6), and every shop |
| `not-found`, `error` | `app/*.tsx` | There is deliberately **no `loading.tsx`**: a root one made every page stream a fallback (CLS 0.3, ~3s LCP delay) and turned redirects/404s into 200s |

API (`app/api/`): `bookstores/filter` (GET, listing data), `bookstores/submit` (POST → SendGrid), `bookstores/[id]/events` (GET), `events` (POST → SendGrid), `contact` (POST → `lib/contact-email.ts`), `newsletter-signup` (POST → appends to Sheet "Newsletter" tab), `features` (GET), `suggest` (GET `?q=` → up to 8 places/shops from `lib/data/search.ts`, rate-limited 60/min, CDN-cached). (`/api/config` was removed — maps get the token as a prop.)

Redirects: `proxy.ts` 308s mixed-case `/bookshop/…` and `/bookshops/…` URLs to lowercase before rendering. `next.config.mjs` maps `/bookstore/:id`, `/submit-bookshop`, `/directory/category/...`. The old `/directory/state/:state`, `/directory/city/[:state/]:city`, `/directory/county/:state/:county` URLs are route handlers in `app/directory/{state,city,county}/` (308 to the `/bookshops` page, via `lib/data/legacy-location-redirect.ts`), because they hold raw names like `CA` or `San Francisco`. `/directory?state=` is not redirected — the directory's own filters use it. `vercel.json` redirects apex → `www`.

## Data flow
```
Google Sheet (tabs: Bookstores, Features, Events; forms append to Newsletter, Submissions)
  → scripts/export-sheet.ts       at build/dev start: one read, checked, → .data/sheet.json
  → lib/google-sheets-client.ts   reads the snapshot: getBookstoresFromSheets(listingOnly), getFeaturesFromSheets, getEventsFromSheets
  → lib/data/bookstore-data.ts    once-per-process memos + processBookstoreData → indexes
  → server pages / API routes     (client components get data as props or via /api/*)
```
- Each Bookstores row is mapped header → cell (`rowToRecord`) and parsed by the zod schema in `lib/data/bookstore-row.ts`. Blank rows and `live=false` rows are skipped silently. Rows with a missing/non-numeric id, no name, or a `#ERROR` value in name/city/state are skipped and logged once as `[GoogleSheets] skipped N invalid rows: …`. A malformed JSON or number cell just becomes null. The schema coerces `feature_ids` (`{1,2}`, `[1,2]` or `1,2`), JSON columns, numbers, and booleans, and turns `imageurl` into a `/photos/...` path.
- **The site never reads the Sheets API while serving.** Each deploy is a snapshot of the Sheet (`.data/sheet.json`, ~14 MB, shipped to every server function via `outputFileTracingIncludes` in `next.config.mjs`). Sheet edits go live on the next deploy: the Sheet's Apps Script "Publish" menu and hourly auto-publish (`scripts/apps-script/publish.gs`), the nightly `.github/workflows/nightly-deploy.yml`, or a merge. Setup: `docs/setup/PUBLISHING.md`. Background: `docs/DATA_SOURCE_OPTIONS.md` (option A).
- If the export fails or `checkSnapshot` rejects it (< 1,000 valid shops, > 5% invalid rows, missing `id`/`name`/`city`/`state` column, empty Features), the build fails and the previous deploy keeps serving.
- `lib/data/bookstore-data.ts` reads each thing once per server process (`once()`) and keeps it: the listing records (`getBookstoresFromSheets(true)` → `toListingBookstore`: only `LISTING_FIELDS` plus the description cut to 150 chars; other fields are undefined), the full records (`getBookstoresFromSheets(false)`, for `getBookstoreBySlugFull`/`getBookstoreById`), features, and events. `getProcessedBookstoreData()` (also React `cache()`) builds the indexes from the listing records and powers home, directory, location pages, sitemap, search, and the filter API. There's no `unstable_cache` and no TTL.
- Keep listing data small: pages and client props that list many shops use the listing records (the directory sends all ~2,200 to the browser). Detail fields come from the full records.
- Page `revalidate` values remain only so date-based content (weekly featured shops, upcoming events) refreshes between deploys; regenerated pages read the same snapshot.
- `ProcessedBookstoreData` indexes: `byId`, `bySlug` (lowercased), `byState` (key = lowercase state abbrev), `byCity`/`byCounty` (key = `makeCityKey(place, state)` → `"<place>|<st>"` lowercased, from `lib/data/location-key.ts`), `byFeature` (feature id string), plus `popular` (top 15 by rating then review count). Nothing is shuffled.
- Search: `lib/data/search.ts` is the only matcher — `/search`, `/api/suggest` (homepage + Header `SearchBox`), and the directory's `?q=` all use it. Every query word must start a word of the shop's name, city, state, or county (accents/apostrophes ignored, generic words like "bookstores in" dropped); exact name > name > city/state > other.
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
- Ads: `components/ads/AdSlot.tsx` + `lib/ads.ts`, off unless `NEXT_PUBLIC_ADSENSE_ENABLED=true` (see `docs/ADS.md`).

## Brand
- Colors: brown `#5F4B32` (headings), teal `#2A6B7C` (primary actions), orange `#E16D3D` (accent/CTAs), cream `#F7F3E8` (section backgrounds), with hover shades for teal and orange.
- Tokens: `app/globals.css` defines `--brand-brown`, `--brand-teal(-hover)`, `--brand-orange(-hover)`, `--brand-cream` (RGB channels) and maps the shadcn theme to them: `primary` = teal, `accent` = orange, `secondary` = brown, `muted` = cream, `border`/`input` = warm gray, `ring` = teal, `--radius` = 0.75rem. `.dark` is still shadcn's default.
- White text on orange must use `bg-brand-orange-strong` (`#C2552A`, 4.5:1) — shadcn `accent` and `<Button variant="accent">` already do; the brand orange itself is 3.25:1 with white, so keep it for accents, borders, and large text.
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
- Never read the Sheets API from a page or API route; add data to the export/snapshot instead.
- Share images: `opengraph-image.tsx` files (rendered by `lib/og.tsx` with the static brand TTFs in `public/fonts/`) for the site default, shops, states, cities, counties, features, state + feature, and blog posts; shop/place images render on first request and are cached. A page that sets its own `openGraph` replaces the inherited image, so general pages pass `DEFAULT_OG_IMAGE` from `lib/seo.ts`. There is no `og-default.jpg`.
- Submissions: `/submit?edit=<slug>` prefills the form for "Suggest an edit"; the API emails only changed fields and appends every submission to the Sheet's `Submissions` tab (must exist — see `docs/setup/FORM_SUBMISSIONS.md`; fails soft).
- Page titles go through `lib/seo.ts` (`fitTitle`/`placeTitle`): ≤ 60 characters, brand "IndieBookShop". `tests/site.test.ts` checks every generated page.
- Mobile: interactive elements are at least 44×44 (`min-h-[44px]`; cards are one stretched link), body text at least 14px. `node scripts/mobile-audit.mjs <base-url> <out-dir>` screenshots every route type at iPhone 14 size and reports overflow, small tap targets, small text, and layout shift. The phone header is 56px (`top-14` for sticky bars below it).
- Before you finish, run `npm run lint`, `npm run check`, `npm test`, and `npm run build`.
