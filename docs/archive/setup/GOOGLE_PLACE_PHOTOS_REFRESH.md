# Refreshing Google Place Photos

## Why photos stop loading (400 errors)

Google **photo references** (the IDs stored in `bookstores.google_photos`) **expire**. They are not long-lived tokens. After a period of time (often weeks), the Places API will return 400 or 404 for those references.

- **API keys** do not need “refreshing” like OAuth tokens; they stay valid until you revoke or restrict them.
- **Photo references** in your database **do** need refreshing by re-fetching from the Places API.

So when images fail with 400, the fix is to **refresh the stored photo data** by re-running enrichment, not to rotate API keys.

## How to refresh photo data

Re-run the Google Places enrichment script so it fetches fresh Place Details (including new photo references) and updates the database.

### Option 1: Refresh only stale data (recommended)

Refreshes bookshops whose Google data is older than 3 months (or never set):

```bash
npx tsx scripts/enrich-google-data.ts --refresh-stale
```

Limit how many to process in one run:

```bash
npx tsx scripts/enrich-google-data.ts --refresh-stale --batch-size=50 --delay=200
```

### Option 2: Refresh all bookshops with Google data

Refreshes every live bookshop that has a `google_place_id` (use sparingly; many API calls):

```bash
npx tsx scripts/enrich-google-data.ts --refresh-all --batch-size=100 --delay=150
```

### Option 3: Refresh a single bookshop

For one store (e.g. ID `12345`):

```bash
npx tsx scripts/enrich-single-bookshop.ts 12345
```

## Required environment variables

- `GOOGLE_PLACES_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Load them (e.g. from `.env` or `.env.local`) before running the scripts.

## After refreshing

Once enrichment has run and updated `google_photos` (and optionally `google_reviews`, ratings, etc.), the site will use the new photo references. No deploy is needed if the app already reads from the same database; reload the bookshop page to see the photos.

## Reducing how often you need to refresh

- Run `--refresh-stale` on a schedule (e.g. monthly) so data doesn’t get too old.
- Avoid caching photo references in CDNs or long-lived caches; treat them as short-lived.

---

## Production: scheduled refresh (avoid expired refs)

Yes — you should refresh photo references on a schedule so production doesn’t hit expired refs.

### What’s already in place

1. **GitHub Actions** (recommended)
   - Workflow: `.github/workflows/refresh-google-photos.yml`
   - Schedule: 1st of every other month at 2:00 UTC (`0 2 1 */2 *`)
   - Runs: `npx tsx scripts/enrich-google-data.ts --refresh-stale --batch-size=1000`
   - **Required:** In the repo’s **Settings → Secrets and variables → Actions**, set:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GOOGLE_PLACES_API_KEY`
   - You can also run it manually: **Actions → Refresh Google Places Photos → Run workflow**.

2. **Vercel Cron**
   - `vercel.json` defines a cron that calls `/api/cron/refresh-google-photos` on the same schedule.
   - The Next.js app has an API route that runs a **small batch** of refreshes per invocation (to stay within serverless time limits). Use this as a supplement; the main scheduled refresh should be GitHub Actions.

### Recommendation

- **Primary:** Keep GitHub Actions as the main process. It can run the full script (up to 1000 stale per run) without timeout.
- **Optional:** If you want extra coverage, the Vercel cron route runs a small batch each time it’s hit (e.g. 30–50 shops). Secure it with `CRON_SECRET_TOKEN` in production.

### If you add a new scheduler

- Run **stale-only** refresh (e.g. `--refresh-stale`) so you only update rows that are old or missing Google data.
- Use a **batch size** and **delay** that respect Google’s rate limits and your timeout (e.g. `--batch-size=500 --delay=150`).
- Ensure `GOOGLE_PLACES_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are available in that environment.
