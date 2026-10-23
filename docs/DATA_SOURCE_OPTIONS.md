# Data source and caching options

Investigation for item D18 (2026-10-23). No app code was changed. All numbers were measured locally on an M-series Mac over home broadband against the live Sheet (2,165 live shops), unless marked as an estimate.

## How it works today

- `getBookstoresFromSheets()` reads the whole `Bookstores` tab (two API calls: header row + `A2:ZZZ`) and parses every row with zod.
- **Listing copy:** stripped to `LISTING_FIELDS`, stored in `unstable_cache` (Vercel Data Cache, shared, 1h). Powers every page except shop details.
- **Full copy:** all columns, kept in module memory per Lambda (1h). Used by shop detail pages for renders that aren't prerendered: ISR revalidation (`revalidate = 86400`), slugs added after the last deploy (`dynamicParams = true`), and numeric-id redirects.
- At build time, ~4,400 pages are prerendered by 9 workers, and each worker reads the Sheet itself.

## Measurements

| What | Result |
|---|---|
| Sheet fetch + parse, full (5 runs) | 1.3–1.5s typical, **5.5s** worst (1 of 6 runs) |
| Sheet fetch + parse, listing | 1.4–1.6s (it reads the same whole tab, then strips it) |
| Raw export of all three tabs (header + rows) | 2.8s, 14.2 MB (6.6 MB gzipped) |
| Full processed payload | **8.8 MB** JSON (2.4 MB gzipped) |
| Listing payload | **759 KB** JSON (184 KB gzipped), under the 2 MB `unstable_cache` limit |
| What makes the full payload big | `googleReviews` 56%, `openingHoursJson` 17%, AI description 6%, description 4% |
| One shop's full record | median 4.1 KB (2.4 KB gzipped), max 9.3 KB |
| `JSON.parse` of the full payload | ~30–40ms |
| **Build from the Sheet** (`next build`, clean `.next`) | **107s** total, page generation 81s, **29 quota retries** (15 × 20s, 14 × 40s) |
| **Build from a local JSON file** of the same data | **39s** total, page generation 22s, 0 Sheets calls |
| Cold detail render (fresh `next start`, `/bookshop/1937` → full data → redirect) | **1.76s** reading the Sheet, **0.23s** reading the local JSON file |
| Warm detail render / prerendered page | 10–20ms / 3ms (the same for both sources) |

Notes:
- Builds sit close to the Sheets read quota (60 reads/min/user). Each retry waits 20s or 40s, and a third consecutive 429 fails the build. That risk grows with more workers or pages.
- On Vercel, a cold render also pays the Lambda cold start (estimated 300–800ms) on top of the numbers above. ISR revalidation happens in the background, so visitors usually see the stale page. The visible cold cost hits new slugs, numeric-id redirects, and the first visitor after a cache miss.

## Options

### A. Sheet stays the editor; export to JSON at build; deploys are triggered

Variant to use: export at build time (a `prebuild` step), **not committed to the repo**. The repo is public. Committing the export hourly would publish the Google review text and the rest of the Places data in git history, which Google's Places terms don't allow us to redistribute. It would also add ~6 MB (gzipped) of history per change.

How it would work:
1. `scripts/export-sheet.ts` (pattern from `scripts/export-fixture.ts`) reads the three tabs once, validates with the existing zod schema, and writes `.data/sheet.json` (gitignored). It fails the build if invalid rows exceed a threshold.
2. `lib/google-sheets-client.ts` reads that file instead of the API. It's the same code path as `USE_FIXTURE_DATA`, which already works. `outputFileTracingIncludes` ships the file to the Lambdas for on-demand renders.
3. Pages use `revalidate = false` and the `unstable_cache` layers go away.
4. Deploys are triggered by:
   - a Vercel Deploy Hook, called by a Sheet Apps Script menu item ("Publish changes") and/or a debounced `onChange` trigger;
   - a daily GitHub Actions cron as a safety net.

Form writes (newsletter, submissions) still append to the Sheet at runtime, which is unchanged.

| | |
|---|---|
| Cold detail render | ~0.23s plus Lambda start, and no network call. Almost all pages are prerendered anyway |
| Build time | ~40s locally vs 107s today: one Sheets read instead of hundreds, so no quota retries |
| Cost | $0 extra. Builds per day = publishes + 1. Hobby and Pro plans include far more build minutes than ~10 short builds/day (check the account's plan) |
| Owner edits | Same Sheet. Changes go live when they click "Publish changes" (~2–3 min deploy) or at the daily rebuild, not within the hour |
| Failure modes | Sheets down or quota → the **build** fails and the previous deploy stays live (today a runtime failure can serve errors or empty pages). Bad rows → caught by validation before deploy, with a clear build log. A forgotten publish → picked up by the daily build |
| Effort | **1.5–2 days** (export script, client switch, revalidate cleanup, deploy hook + Apps Script, docs/tests) |

### B. Sheet stays; processed JSON in Vercel Blob

At revalidate time (cron or on-demand), a route reads the Sheet, processes it, and writes `bookstores-full.json` (8.8 MB) and `listing.json` to Vercel Blob. Pages read from Blob instead of the Sheet.

| | |
|---|---|
| Cold detail render | Estimate: 150–400ms to download 2.4 MB gzipped from Blob plus parse, plus Lambda start. Per-shop blobs (2–4 KB each) would make it ~50–100ms, at the cost of 2,165 writes per refresh |
| Build time | Similar to A if the build reads Blob (one read). The quota problem goes away |
| Cost | Pennies: <10 MB stored, a few thousand reads/month (Blob's included allowance covers it on Pro; check Hobby limits) |
| Owner edits | Same Sheet. Live within the refresh interval (or on-demand via the same Apps Script button hitting a revalidate route) |
| Failure modes | A refresh that fails keeps the last good blob. Runtime now depends on Blob instead of Sheets (more reliable, no quota). Bad rows are only noticed in logs |
| Effort | **1–1.5 days**. Adds a write path, a secret, and a cron route. Pages stay ISR |

### C. Back to Postgres (Neon or Supabase)

Load the Sheet into a `bookstores` table (the types in `shared/schema.ts` were drizzle-generated originally and map almost 1:1). Pages query by slug, and listing queries select only the needed columns.

| | |
|---|---|
| Cold detail render | Estimate: 30–100ms per query from a Vercel region near the DB. Serverless driver connection adds ~50–150ms cold |
| Build time | Estimate ~40s (one query per worker, no quota) |
| Cost | Free tier fits (2,165 rows, <20 MB). Neon free: 0.5 GB, autosuspend adds ~300–500ms to the first query after idle; Supabase free pauses after a week of inactivity. Paid ≈ $19–25/month to avoid both |
| Owner edits | Either (1) keep editing the Sheet and sync it to the DB (then this is option B with a database), or (2) edit in the Supabase/Neon table UI or a small admin page, which is less friendly than a Sheet for a non-developer |
| Failure modes | DB outage or paused free tier → runtime errors. Schema migrations become part of every data change. Bad rows are blocked by constraints, which is good |
| Effort | **4–6 days** (schema + migrations, import script, rewrite of the data layer and its tests, admin/edit flow, env + CI secrets). The repo removed its Supabase code in Prompt 4 |

## Comparison

| | A. Export at build | B. Blob | C. Postgres |
|---|---|---|---|
| Runtime dependency | none | Blob | database |
| Cold detail render | fastest (local file) | medium | medium |
| Build | 39s, no quota risk | ~40s | ~40s |
| Freshness | on publish (~3 min) + daily | refresh interval | immediate |
| Owner workflow | Sheet + "Publish" button | Sheet | Sheet + sync, or DB UI |
| Bad data | blocked before deploy | logged | blocked by constraints |
| Extra cost | $0 | ~$0 | $0–25/mo |
| Effort | 1.5–2 days | 1–1.5 days | 4–6 days |

## Recommendation: A (export at build, not committed, deploy on publish)

- It removes every runtime Sheets read and both caches. The 2 MB limit, the per-Lambda full copy, and the 1.8s cold fetch disappear.
- It cuts the build from 107s to ~40s and ends the quota retries, which are the most likely future cause of a failed deploy.
- A Sheets outage or a bad edit can no longer break the live site. The build fails and the last good deploy keeps serving.
- The owner keeps the Sheet. The one change is pressing "Publish changes", or waiting for the nightly build.

The trade-off is freshness: edits aren't live until a deploy (minutes) instead of within the hour. For a directory edited by hand a few times a week, that's acceptable, and the Publish button makes it faster than today when it's used.

Choose B instead if edits must appear without a deploy. Choose C only if the site will gain user accounts, user-submitted data written directly to the database, or editing by several people with permissions.
