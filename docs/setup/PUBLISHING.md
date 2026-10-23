# Publishing Sheet changes

The website is built from a snapshot of the Google Sheet taken at deploy time (`scripts/export-sheet.ts` → `.data/sheet.json`). It never reads the Sheet while serving pages. **Editing the Sheet doesn't change the site until the next deploy.**

A deploy starts when:
- someone chooses **IndieBookShop → Publish changes to the website** in the Sheet (2–3 minutes until it's live);
- the Bookstores, Features, or Events tab was edited and nobody has edited for 10 minutes (checked hourly, once auto-publish is on);
- the nightly GitHub Action runs (09:00 UTC);
- code is merged to `main`.

If the Sheet can't be read or the data looks broken (fewer than 1,000 valid shops, more than 5% invalid rows, a renamed `id`/`name`/`city`/`state` column, or an empty Features tab), the build fails and **the current site stays up**. The reason is at the top of the Vercel build log (`[export-sheet] Not using this export: …`).

## One-time setup (about 15 minutes)

1. **Create a Vercel deploy hook.** Vercel → indiebookshop project → Settings → Git → Deploy Hooks. Name it `sheet-publish`, branch `main`, then copy the URL. Treat it like a password: anyone with it can trigger deploys.
2. **Add the script to the Sheet.** In the Sheet: Extensions → Apps Script. Replace the editor's contents with `scripts/apps-script/publish.gs` and save.
3. **Store the hook URL.** In Apps Script: Project Settings (gear) → Script Properties → Add property `VERCEL_DEPLOY_HOOK_URL` with the URL from step 1.
4. **Turn on auto-publish (optional, recommended).** In the editor, choose the `installAutoPublish` function and click Run, then approve the permissions prompt (it needs to call an external URL and run on a timer).
5. **Reload the Sheet.** The IndieBookShop menu appears. Try Publish once and watch the deploy appear in Vercel.
6. **Nightly deploy.** In GitHub → repo Settings → Secrets and variables → Actions, add `VERCEL_DEPLOY_HOOK_URL` with the same URL. Without it the nightly workflow skips.

## Notes

- Pages that depend on the date (the homepage's featured shops, upcoming events) still refresh on their own via ISR between deploys; only Sheet edits need a deploy.
- Form submissions and newsletter signups still write straight to the Sheet, and they don't trigger deploys.
- Locally, `npm run dev` and `npm run build` export the Sheet first (`npm run export-sheet` on its own works too). Scripts that read shop data through `lib/google-sheets-client.ts` (e.g. `scripts/tag-features.ts`) read `.data/sheet.json`, so run the export first.
