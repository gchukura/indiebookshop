# Photo pipeline: inventory and plan

Investigation done 2026-10-22 against the live Sheet and www.indiebookshop.com. No app code was changed.

**Summary:** none of the photo data we held worked. The stored URLs pointed at a deleted Supabase project, and the stored Google photo references had expired. The only durable asset was `google_place_id`, which 2,112 of the 2,165 live shops have.

**Decision (2026-10-22):** fetch one Google photo per shop once, by place ID, and keep it in Cloudflare R2 with the photographer credit. Shops without a photo show a generic book placeholder. Sections 1–2 are the original inventory; sections 3–5 describe what was built.

## 1. What the Sheet holds

`Bookstores` tab: 3,026 rows, 2,165 live. The image column header is **`imageurl`** (not `image_url`); the Sheets client reads both.

| Column | Live rows (2,165) | All rows (3,026) |
|---|---|---|
| `imageurl` → Supabase Storage URL | **2,059** | 2,239 |
| `imageurl` → r2.dev URL | 0 | 0 |
| `imageurl` → Vercel Blob / other | 0 | 0 |
| `imageurl` empty | 106 | 787 |
| `google_photos` = JSON array of `{photo_reference, …}` (legacy Places API) | **2,060** (avg 4.9, max 5 per shop) | 2,240 |
| `google_photos` empty | 105 | 786 |
| `google_place_id` (`ChI…`) | **2,112** | 2,297 |
| `google_place_id` empty | 52 | 728 |

`google_data_updated_at` is 2026-02 for every enriched live row, so the photo references are about 8 months old. All 2,239 Supabase URLs use one host and the path `/storage/v1/object/public/bookshop-photos/<file>`.

A 20-row sample (every ~100th live row, ids 1 … 2974) matched these totals: Supabase `imageurl`, five `photo_reference` objects, and a place ID on every row.

**Are they usable?**
- **Supabase URLs: dead.** The project's hostname returns `NXDOMAIN` (the project was deleted), so these files can't be recovered from Supabase. The app already nulls them in `lib/google-sheets-client.ts`.
- **`photo_reference`s: expired.** Three references (rows 0, 900, 1800) sent through the production `/api/place-photo` came back `400` from Google. Production does have `GOOGLE_PLACES_API_KEY` (no 500 "Server configuration error"). Legacy references are short-lived by design, which is why there was a refresh workflow.
- **`google_place_id`: stable**, and the only usable input for getting photos.

## 2. The photo scripts

| Script | What it does | Can it run today? |
|---|---|---|
| `scripts/migrate-photos-to-r2.mjs` | Downloads each Supabase `imageurl` with the service-role key, uploads to Cloudflare R2, writes the R2 URL back to the Sheet | **No.** Its only source is the deleted Supabase bucket. No `R2_*` vars exist locally either. |
| `scripts/download-photos-to-blob.mjs` | For rows with `google_photos` but no `imageurl`: fetches the first photo from Google, uploads to Vercel Blob, writes the URL to the Sheet | **No.** Stored references are expired, every row already has a (dead) Supabase `imageurl` so it skips them, and Blob was dropped on 2026-03-12 after hitting the Hobby storage limit (commit `6eca13c`). |
| `scripts/reenrich-photos-to-blob.mjs` | Same as above, but first gets fresh references from legacy Place Details (`place_id` → `photos`) | **Partly.** The Google half works with a key. The Blob half has the same Hobby-limit problem, and it skips rows that have any `imageurl`. |
| `scripts/migrate-photos-to-supabase.mjs` | Fresh references from Place Details → uploads to Supabase Storage → writes URL to the Sheet | **No.** Supabase project is gone. |
| `.github/workflows/refresh-google-photos.yml` | Every other month, runs `scripts/enrich-google-data.ts --refresh-stale` with Supabase secrets | **No.** The script reads and writes Supabase. The last three runs (2026-03-01, 05-01, 07-01) all failed. It should be deleted (Prompt 4). |

The useful pieces to reuse: the place-ID → fresh-reference → bytes logic in `reenrich-photos-to-blob.mjs` and `migrate-photos-to-supabase.mjs`, and the S3/R2 upload code in `migrate-photos-to-r2.mjs`.

## 3. Options considered

- **(a) R2 via a one-time backfill script.** About $15 once in Google calls, then ≈ $0/month (R2 free tier, zero egress). **Chosen.**
- **(b) Vercel Blob via a backfill script.** The same Google cost, plus Vercel Pro (~$20/month), because the Hobby Blob limit was already hit in March.
- **(c) Proxy Google photos at request time by place ID.** Nothing stored, but each CDN miss is billed, and images depend on Google being up.

**Terms of service.** Google Maps Platform terms don't allow storing Places photos long-term, and they require showing the author's attribution. The owner accepted the storage risk. We store and show the attribution. If Google objects, switch the affected shops to option (c) or to owner-supplied photos.

## 4. What was built

**`scripts/fetch-google-photos.mjs`** (run locally, see the file header for flags):
1. Reads the live rows in `Bookstores` that have a `google_place_id` and an `imageurl` not already on R2.
2. Calls Place Details (New) with field mask `photos`. This is the free "IDs Only" SKU. It prefers a landscape photo among the first three, else the first.
3. Downloads the photo at 1600px and re-encodes it with `sharp` to `photos/<id>-<sha1-10>.webp` (1200px, q72, ~100 KB), `…-800.webp` (q72, ~60 KB; the detail page's srcset picks it on phones), and `…-400.webp` (q70, ~15 KB). `scripts/add-photo-800.mjs` backfilled the `-800` files from the 1200px ones on 2026-10-28.
4. Uploads both to R2 with `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable`. The hash in the name means a new photo gets a new URL.
5. Writes the r2.dev URL to `imageurl`, and the first author's name and profile URL to `photo_attribution` and `photo_attribution_url` (columns AS/AT). Writes are batched every 50 rows.
- `--dry-run` makes Details calls only: no media downloads, uploads, or Sheet writes. `--limit N`, `--ids a,b`, `--force`, `--report <path>`.
- Calls to Places are spaced 150 ms apart, with backoff on 429/5xx. A full run is ~2,055 photo media calls (billed SKU, ~$7 per 1,000) and takes ~15–20 minutes.

**Serving.** `next.config.mjs` rewrites `/photos/:path*` to `${R2_PUBLIC_URL}/photos/:path*`. Photos are served from our own domain and cached by Vercel's CDN, so the rate-limited r2.dev URL is only hit on cache misses. DNS stays on Vercel, with no Cloudflare custom domain needed. `R2_PUBLIC_URL` must be set in Vercel's env at build time.

**App.**
- `lib/google-sheets-client.ts` converts an r2.dev `imageurl` into a `/photos/...` path and nulls any other host (the dead Supabase URLs). `photoAttribution*` are read in the full (detail) branch only. The listing branch leaves them null to stay under the 2 MB cache limit.
- `lib/bookshop-image.ts`:
  - `getBookshopPhotoUrl(shop, size)` returns the real photo or null.
  - `getPlaceholderUrl(id, size)` returns `/placeholders/books-NN[-400].webp` with `NN = id % 18 + 1`, so it's stable per shop.
  - `getBookshopImageUrl(shop, size)` returns the photo, else the placeholder.
- Cards (home, related shops) always show an image: the shop's photo or its placeholder. `BookshopImage` falls back to the placeholder if the photo fails to load.
- Detail page: a single photo (16:9) replaces the old `googlePhotos` gallery. It shows "Photo: {author} via Google", linked to the author, when the shop has its own photo.
- og:image / twitter:image and the `BookStore` JSON-LD `image` use the real photo only. Shops without one keep `og-default.jpg` and no JSON-LD image. Placeholders are never used there.
- Placeholders have no "illustrative" label. Alt text is the shop's name and location, the same as a real photo (owner's call).
- Removed: `app/api/place-photo` (it took the expired `photo_reference`s and was a billable open endpoint) and the `maps.googleapis.com` / `*.r2.dev` `images.remotePatterns` (nothing uses `next/image` for photos).

**Placeholders.** `public/placeholders/` holds 18 Unsplash photos (Unsplash License, no attribution required) of shelves and stacks. There are no people, recognisable libraries, or readable covers. Sources are listed in `public/placeholders/SOURCES.md`. To change the count, update `PLACEHOLDER_COUNT` in `lib/bookshop-image.ts`.

## 5. Status and follow-ups

Dry run, 2026-10-22, over the 2,165 live shops:

| Result | Shops |
|---|---|
| Photo available | 2,055 |
| Place ID valid but Google has no photos | 50 |
| Stale place ID (`NOT_FOUND`, "no longer valid") | 8 — ids 929, 982, 1276, 1387, 2039, 2454, 2816, 2960 |
| No place ID | 52 |

That leaves 110 shops on placeholders. A test run wrote shops 1, 588 and 2972. The full run waits until this branch is deployed, so production doesn't serve r2.dev URLs directly.

Follow-ups:
- Re-run the script for new shops after they get a place ID. It skips shops already on R2.
- Refresh the 8 stale place IDs, e.g. with a Text Search by name and city.
- Delete `.github/workflows/refresh-google-photos.yml` and archive the Supabase/Blob photo scripts (Prompt 4).
- The project predates Vercel's April 2026 default of caching external rewrites, so `next.config.mjs` sets `x-vercel-enable-rewrite-caching: 1` on `/photos/:path*`. Without it, every photo request went to r2.dev (`x-vercel-cache: MISS`).
- Set a Google Cloud budget alert on the Places key.
