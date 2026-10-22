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
- `scripts/setup-google-sheets.sh <service-account.json>` — prints the credentials JSON as a one-line env value
- No test runner or linter configured yet.

## Env vars (`.env.local`)
| Var | Used by | Required |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | `lib/google-sheets-client.ts` — single-line JSON with `client_email`, `private_key` | yes |
| `GOOGLE_SHEETS_ID` | Sheet id (falls back to a hard-coded id) | recommended |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (or `MAPBOX_ACCESS_TOKEN`) | `/api/config`, `DirectoryClient`, `SingleLocationMap` | for maps |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | contact, submit, events emails | for forms |
| `R2_PUBLIC_URL` | `next.config.mjs` rewrite `/photos/*` → R2 bucket (build time) | for photos |
| `GOOGLE_PLACES_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | `scripts/fetch-google-photos.mjs` only (run locally) | no |
| `NEXT_PUBLIC_BASE_URL` | only `lib/seo-utils.ts` (currently unused) | no |

## Routes
| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | server, `revalidate=3600`; featured, popular, browse-by-state |
| `/directory` | `app/directory/page.tsx` + `DirectoryClient.tsx` | server page reads `?state&city&county&features`, client list + Mapbox map |
| `/bookshop/[slug]` | `app/bookshop/[slug]/page.tsx` + `BookshopDetailClient.tsx` | all slugs via `generateStaticParams`, `dynamicParams=true`, `revalidate=86400`; numeric id / non-canonical slug → client-side `router.replace` |
| `/about`, `/blog` | static server pages | blog is a placeholder |
| `/events` | `app/events/page.tsx` (`'use client'`) + `EventsClient.tsx` | fetches `GET /api/events` and `/api/bookstores`, neither exists (only `POST /api/events`) |
| `/submit`, `/submit-event`, `/contact` | client pages with forms | |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | sitemap still emits `/state/`, `/city/`, `/county/`, `/features/` URLs that have no routes (404) |
| `not-found`, `error`, `loading` | `app/*.tsx` | |

API (`app/api/`): `bookstores/filter` (GET, listing data), `bookstores/submit` (POST → SendGrid), `bookstores/[id]/events` (GET), `events` (POST → SendGrid), `contact` (POST → `lib/contact-email.ts`), `newsletter-signup` (POST → appends to Sheet "Newsletter" tab), `features` (GET), `config` (GET Mapbox token).

Redirects: `next.config.mjs` maps `/bookstore/:id`, `/submit-bookshop`, `/directory/{state,city,county,category}/...` to current URLs; `vercel.json` redirects apex → `www`.

## Data flow
```
Google Sheet (tabs: Bookstores, Features, Events, Newsletter)
  → lib/google-sheets-client.ts   getBookstoresFromSheets(listingOnly), getFeaturesFromSheets, getEventsFromSheets, appendNewsletterSignup
  → lib/data/bookstore-data.ts    caches + processBookstoreData → indexes
  → server pages / API routes     (client components get data as props or via /api/*)
```
- The Sheets client maps header names (lowercased) to columns, skips rows with no name or `#ERROR` cells, drops `live=false`, parses `feature_ids` (`{1,2}`, `[1,2]` or `1,2`), JSON columns, and booleans. Rows are cast `as unknown as Bookstore` — no runtime validation.
- **Two caches, on purpose:**
  1. **Listing cache** — `getCachedRawBookstores = unstable_cache(getBookstoresFromSheets(true), revalidate 3600)`. Detail-only fields (street, zip, phone, website, reviews, hours, google_*, AI description) are nulled and description cut to 150 chars so the payload fits Vercel's **2 MB unstable_cache entry limit**. It lives in Vercel's shared Data Cache, so it survives cold starts. `getProcessedBookstoreData()` (wrapped in React `cache()` plus a 1h module-level memo) builds on this and powers home, directory, sitemap, filter API, related shops.
  2. **Full cache** — `fetchFullBookstoreData()` calls `getBookstoresFromSheets(false)` and keeps all columns in a module-level variable (1h TTL). No size limit, but per-Lambda: a cold detail-page render fetches the whole Sheet. Used only by `getBookstoreBySlugFull` and `getBookstoreById` (detail pages).
- Don't add detail fields to the listing record — it will blow the 2 MB limit. Detail data must come from the full cache.
- `ProcessedBookstoreData` indexes: `byId`, `bySlug` (lowercased), `byState` (key = lowercase state abbrev), `byCity`/`byCounty` (key = `` `${name}-${st}` `` lowercased — breaks for hyphenated names in `getCitiesWithState`), `byFeature` (feature id string), plus `featured` (random 8), `popular` (top 15 by rating then review count). `getFeaturedBookstores` reshuffles on every call.
- Slugs: `bookstore.slug` from the Sheet, else `generateSlugFromName(name)`. State conversion: `lib/state-utils.ts` (`getStateAbbrev`, `getStateDisplayName`).
- Photos (see `docs/PHOTO_PIPELINE.md`): one Google photo per shop, fetched once by `scripts/fetch-google-photos.mjs` into R2 as `photos/<id>-<hash>.webp` (1200px) plus `-400.webp`. The Sheet's `imageurl` holds the r2.dev URL; the Sheets client turns it into a same-origin `/photos/...` path (served via the rewrite) and drops any other host. `photo_attribution`/`photo_attribution_url` hold the photographer credit shown on detail pages. Shops without a photo get a generic placeholder from `public/placeholders/` picked by `id % 18`. In `lib/bookshop-image.ts`: `getBookshopImageUrl` (photo or placeholder, for display) and `getBookshopPhotoUrl` (real photo or null — use this for og:image and JSON-LD, never placeholders). `googlePhotos` is always null (legacy references expired).

## Bookstore type
`Bookstore` is a plain TypeScript type in `shared/schema.ts`. `Feature`, `Event`, and zod `insert*Schema`s live there too. Fields and their Sheet columns (`Bookstores` tab):
- Core: `id`, `name`, `slug`, `street`, `city`, `state`, `zip`, `county`, `description`, `imageUrl` (`imageurl`), `photoAttribution`, `photoAttributionUrl`, `website`, `phone`, `live`
- Location: `latitude`/`longitude` — strings, from `lat_numeric`/`lng_numeric`, else `latitude`/`longitude`
- `featureIds` (`feature_ids`) → ids in the `Features` tab (id, name, slug, description, keywords, icon)
- Google Places enrichment: `googlePlaceId`, `googleRating` (string), `googleReviewCount`, `googleDescription`, `googlePhotos` (null for now), `googleReviews` (JSON), `googlePriceLevel`, `googleDataUpdatedAt`, `googleMapsUrl`, `googleTypes` (JSON), `formattedAddressGoogle`, `businessStatus`, `formattedPhone`, `websiteVerified`, `contactDataFetchedAt`
- Hours: `openingHoursJson` and `hours` both come from `opening_hours_json` (`{ open_now, weekday_text[], periods[] }`)
- AI copy: `aiGeneratedDescription`, `descriptionSource`, `descriptionGeneratedAt`, `descriptionValidated`
- Description priority on detail pages: `description` → `googleDescription` → validated `aiGeneratedDescription` → template. This logic is duplicated in `page.tsx` generateMetadata and `BookshopDetailClient.tsx`.

`Event` (`Events` tab): `id, bookshopId, title, description, date, time`.

## Key files
- `components/Header.tsx`, `Footer.tsx` (client; footer posts the newsletter form), `Logo.tsx`
- `components/StructuredData.tsx` — JSON-LD (`LocalBusinessSchema`, `BreadcrumbSchema`, etc.)
- `components/BookshopImage.tsx`, `RelatedBookshops.tsx`, `SingleLocationMap.tsx` (Mapbox), forms `BookshopSubmissionForm.tsx`, `EventSubmissionForm.tsx`
- `components/ui/` — shadcn primitives. `components/Providers.tsx` wraps the app in React Query (`lib/queryClient.ts`); used by the events page, the two forms, and `RelatedBookshops`.
- Imported by nothing (candidates for removal): `lib/seo-utils.ts`, `lib/bookstore-content-utils.ts`, `components/templates/`, `components/StateFlag.tsx`, `components/ads/*` (AdSense, not rendered).

## Brand
- Colors: brown `#5F4B32` (headings), teal `#2A6B7C` (primary actions), orange `#E16D3D` (accent/CTAs), cream `#F7F3E8` (section backgrounds). Hover shades in use: `#1d5a6a` (teal), `#d06a4f` (orange). Also in `lib/constants.ts` `COLORS`.
- Today these are hard-coded hex classes (`text-[#5F4B32]`); `app/globals.css` still has the default shadcn slate theme, so `bg-primary` is navy, not brand.
- Fonts: Libre Baskerville (`font-serif`, headings) and Open Sans (`font-sans`, body) per `tailwind.config.ts`. `app/layout.tsx` currently loads only Inter via `next/font`, so the brand fonts don't actually load.
- Type scale tokens in tailwind: `text-display`, `text-h1`…`text-h4`, `text-body-lg`, `text-body`, `text-body-sm`, `text-label`, `text-meta`.

## Conventions
- Server components by default. Use `'use client'` only for interactive islands (maps, forms, filters, menus), and pass data down as props instead of fetching after mount.
- Import data through `@/lib/data/bookstore-data`, never call the Sheets client from pages directly (except events/features until they get cached getters).
- Path aliases: `@/*` → repo root, `@shared/*` → `shared/`.
- Once brand tokens exist in `globals.css`/`tailwind.config.ts`, no new hard-coded hex colors. Use the token classes.
- Mapbox/`mapbox-gl` is heavy, so load map components with `next/dynamic({ ssr: false })`.
- Keep the 2 MB `unstable_cache` limit in mind for anything you cache.
- Before you finish, run `npm run check` and `npm run build`.
