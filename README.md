# IndieBookShop.com

A directory of independent bookshops across the United States: browse by state and city, search, see shops on a map, and view details, hours, and photos for each shop.

Live at https://www.indiebookshop.com.

## Stack

- **Next.js 16** (App Router), React 18, TypeScript
- **Tailwind CSS 3** with shadcn/ui (Radix) components
- **Google Sheets** as the data source (no database), read with `googleapis`
- **Mapbox GL** for maps, **SendGrid** for form emails
- **Cloudflare R2** for shop photos, served at `/photos/*` through a rewrite
- **Upstash Redis** (optional) for rate limiting form endpoints
- Deployed on **Vercel**

## Routes

| Route | What it is |
|---|---|
| `/` | Home: featured and popular shops, browse by state |
| `/directory` | Searchable list and map, filters `?state=&city=&county=&features=` |
| `/bookshop/[slug]` | Shop detail page (prerendered for every shop) |
| `/about`, `/blog`, `/events` | Content pages |
| `/submit`, `/submit-event`, `/contact` | Forms (email via SendGrid) |
| `/sitemap.xml`, `/robots.txt` | Generated from the data |

API routes live in `app/api/`: `bookstores/filter`, `bookstores/submit`, `bookstores/[id]/events`, `events`, `contact`, `newsletter-signup`, and `features`.

## Setup

Requires Node.js 20+.

```bash
git clone https://github.com/gchukura/indiebookshop.git
cd indiebookshop
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

## Environment variables

Put these in `.env.local` for local development and in the Vercel project settings for deploys.

| Variable | Needed for |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | **Required.** Service account key as one-line JSON. Wrap it in single quotes in `.env.local` so `\n` in the private key isn't expanded. For example: `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account",...}'`. |
| `GOOGLE_SHEETS_ID` | The spreadsheet id (falls back to the production sheet) |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` or `MAPBOX_ACCESS_TOKEN` | Maps |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | Contact, submission, and event emails |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared rate limiting (falls back to in-memory) |
| `R2_PUBLIC_URL` | Shop photos. The bucket's public r2.dev URL, needed at build time for the `/photos/*` rewrite |
| `GOOGLE_PLACES_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Only for `scripts/fetch-google-photos.mjs` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build. Fetches the Sheet and prerenders every shop page, so it needs the Google credentials. |
| `npm run start` | Serve the production build |
| `npm run check` | Type-check (`tsc --noEmit`) |
| `node scripts/fetch-google-photos.mjs [--dry-run]` | Fetch one Google photo per shop into R2 for shops that don't have one yet |
| `npx tsx scripts/test-interactive-elements.ts [url]` | Playwright smoke test of buttons, search, and forms against a running site |

## Project layout

```
app/          routes, layouts, API route handlers
components/   UI components (components/ui = shadcn primitives)
lib/          data access (lib/data/bookstore-data.ts), Sheets client, helpers
shared/       shared types and zod schemas
public/       static assets, incl. public/placeholders (generic shop photos)
scripts/      maintenance scripts (scripts/archive = old, not runnable)
docs/         setup notes and design docs (docs/archive = old reports)
```

See [CLAUDE.md](CLAUDE.md) for the data flow, caching, and conventions, and [docs/PHOTO_PIPELINE.md](docs/PHOTO_PIPELINE.md) for how shop photos work.
