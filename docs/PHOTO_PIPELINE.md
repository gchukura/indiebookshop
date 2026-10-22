# Photo pipeline: inventory and plan

Investigation done 2026-10-22 against the live Sheet and www.indiebookshop.com. No app code was changed.

**Summary:** none of the photo data we hold works today. The stored URLs point at a deleted Supabase project, and the stored Google photo references have expired. The only durable asset is `google_place_id`, which 2,112 of the 2,165 live shops have. Any fix has to fetch photos from Google again. The recommendation is option (c), a place-ID-based proxy.

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

## 3. Options for one photo per shop

Shared facts:
- **Backfill size:** ~2,112 shops with a place ID. At 800px JPEG (~100–150 KB each, estimated) that's ~250 MB.
- **Google pricing:** Places API (New) photo media is roughly **$7 per 1,000** requests, with a monthly free allowance. Getting a photo name via Place Details costs one more request per shop, and fetching only the `photos` field may fall in a free SKU. These are list-price estimates; check https://developers.google.com/maps/billing-and-pricing/pricing before committing.
- **Terms of service:** the Google Maps Platform terms don't allow storing Places content, photos included, beyond what they explicitly permit; `place_id` is the exception. They also require showing the photo's author attribution. Options (a) and (b) copy Google photos into permanent storage, which these terms don't allow. That's a policy risk for the owner to weigh (this isn't legal advice). It goes away if the photos are the shops' own (submitted or licensed).

### (a) Cloudflare R2 via a backfill script
Write a new script (the existing R2 one can't work): place ID → Place Details (New) `photos` → media → upload to R2 → write the `r2.dev` URL to `imageurl`.
- **Cost:** about **$15 once** in Google calls (≈2,112 detail + 2,112 photo requests, less any free allowance). Storage stays in R2's free tier (10 GB, zero egress). ≈ $0/month afterwards.
- **Effort:** ~1 day. Set up the R2 bucket and public access, write and run the script (~30–45 min at a polite rate), schedule it for new shops.
- **Downsides:** the ToS issue above. A pipeline to keep running for new shops. Attribution has to be captured and stored separately.

### (b) Vercel Blob via a backfill script
Same as (a), uploading to Blob instead.
- **Cost:** same one-time Google cost, but the Hobby limit was already hit in March, so this needs **Vercel Pro (~$20/month)** plus Blob usage.
- **Effort:** ~0.5–1 day (the scripts mostly exist).
- **Downsides:** the same ToS issue plus a recurring plan cost. No advantage over (a).

### (c) Proxy Google photos at request time, keyed by place ID (recommended)
Change `app/api/place-photo/route.ts` to take `?place_id=` instead of a stored reference. It looks up a fresh photo name on each cache miss, so nothing expires and nothing is stored. The Vercel CDN caches the image response.
- **Cost:** each CDN cache miss costs one Details lookup plus one photo request. With one width and a 30-day `s-maxage`, the worst case (every shop viewed in every region every month) is about 2,112 × a few regions ≈ **5–10k photo requests/month ≈ $35–70** before the free allowance. Real traffic is concentrated on fewer pages, so expect much less. Watch the Google Cloud billing report for the first month and set a budget alert.
- **Effort:** ~0.5–1 day. No backfill, no bucket, no workflow. New shops get photos automatically.
- **Downsides:** per-view cost scales with traffic. Images depend on Google being up. The first view after a cache miss is slower (~0.5–1 s, measured on the current proxy).

**Pick: (c).** It's the only option that needs no new storage account, no backfill, and no refresh job. It avoids storing Google content and works for shops added later. If the monthly Google bill grows past what R2 would cost, switch to (a) for shops whose owners provide their own photos.

## 4. Code changes for option (c)

**`lib/google-sheets-client.ts`**
- Listing branch: set `googlePlaceId: get('google_place_id') || null` instead of `null`, so cards built from the listing cache can make a photo URL. That's ~27 chars × 2,165 ≈ 60 KB, well inside the 2 MB `unstable_cache` limit.
- Both branches: keep nulling Supabase `imageurl` values, now permanently. Simplest is to null any host other than the ones we serve, so a stray dead URL can't come back. Remove the "pending R2 migration" comments.
- Keep `googlePhotos: null`. The stored references are expired, and leaving them out saves ~4.6 MB of cache payload.

**`app/api/place-photo/route.ts`**
- Accept `place_id` (validate `^[A-Za-z0-9_-]{10,300}$`) and `w` (clamp to 200–1200, default 600). Drop the `photo_reference` path, since all stored references are dead.
- Look up the photo name with `GET https://places.googleapis.com/v1/places/{place_id}` and header `X-Goog-FieldMask: photos`. Wrap it in `unstable_cache` keyed by place ID (`revalidate: 86400`) so repeat misses skip the Details call.
- Fetch `https://places.googleapis.com/v1/{photos[0].name}/media?maxWidthPx={w}&skipHttpRedirect=true` and stream the bytes from the returned `photoUri`.
- Respond with `Cache-Control: public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800`. A shop with no photos returns `404` with a short `s-maxage` (1 day) so it's retried later.
- Return the first author attribution in an `X-Photo-Attribution` header for logging. Displaying it is handled by the detail page (below).
- Rate-limit with `lib/rate-limit.ts` (e.g. 120/min per IP) to cap abuse of the billable endpoint.

**`lib/bookshop-image.ts`**
- `getBookshopThumbnailUrl(bookshop, width = 600)`:
  1. Return `imageUrl` if set (it can only be a non-Supabase URL now).
  2. Else, if `googlePlaceId` is set, return `/api/place-photo?place_id=${encodeURIComponent(googlePlaceId)}&w=${width}`.
  3. Else return `null` (callers already skip the image).
- Snap `width` to a couple of fixed sizes (400, 800) so the CDN key space stays small.
- Delete `extractPhotoReference` and the `googlePhotos` branch.

**`components/BookshopImage.tsx`**
- Replace the Unsplash stock-photo fallback with a neutral cream placeholder showing the shop's initials. Currently any failed photo shows an unrelated stock image of a library, which misrepresents the shop. Accept a `name` prop for the initials.
- Add `width`/`height` (or an aspect-ratio wrapper) and `decoding="async"` to avoid layout shift. Keep the plain `<img>` with `loading="lazy"`: the proxy already returns sized images, and routing them through `next/image` would spend Vercel image-optimization quota for no gain.

**`next.config.mjs`**
- Remove the `*.r2.dev` and `maps.googleapis.com` `remotePatterns`. Nothing uses `next/image` with remote photo hosts (`BookshopImage` is a plain `<img>`, and the proxy is same-origin).
- If a later task switches cards to `next/image`, add `images.localPatterns: [{ pathname: '/api/place-photo', search: '' }]` instead. Next 16 requires local images with query strings to be allow-listed.

**Related, outside the four files:**
- `app/bookshop/[slug]/BookshopDetailClient.tsx` builds its gallery from `googlePhotos` (always null). Make it a single hero from `getBookshopThumbnailUrl(bookstore, 800)` with a "Photo: {author} via Google" credit. The credit can come from a small cached server call to the same Details lookup.
- Delete `.github/workflows/refresh-google-photos.yml` and archive the Supabase/Blob photo scripts (Prompt 4).
- Set a Google Cloud budget alert on the Places API key before launch.
