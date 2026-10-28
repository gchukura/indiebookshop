# IndieBookShop.com documentation

Current docs for the Next.js app. Start with `CLAUDE.md` and `README.md` at the repo root.

## Data and photos
- [DATA_SOURCE_OPTIONS.md](./DATA_SOURCE_OPTIONS.md) — why the site builds from a Sheet snapshot (option A) and the alternatives considered
- [setup/PUBLISHING.md](./setup/PUBLISHING.md) — how Sheet edits go live (Apps Script publish, nightly deploy)
- [PHOTO_PIPELINE.md](./PHOTO_PIPELINE.md) — one Google photo per shop, stored in R2

## Forms and email
- [setup/FORM_SUBMISSIONS.md](./setup/FORM_SUBMISSIONS.md) — submissions, "Suggest an edit", and the Sheet's `Submissions` tab
- [setup/RATE_LIMITING.md](./setup/RATE_LIMITING.md) — rate limits and the honeypot on form endpoints
- [setup/FIX_SENDGRID_EMAIL.md](./setup/FIX_SENDGRID_EMAIL.md) — troubleshooting SendGrid

## Ads
- [ADS.md](./ADS.md) — AdSense slots, where they render, and the env flag

## Screenshots and audits
- `screenshots/` — before/after screenshots from the tokens, detail, homepage, and mobile passes
- [screenshots/mobile/LIGHTHOUSE.md](./screenshots/mobile/LIGHTHOUSE.md) — mobile Lighthouse scores and audit results

## Archive
`archive/` holds notes from earlier versions of the site (Vite/Express, Supabase, Edge Middleware). They describe code that no longer exists; don't follow them.
