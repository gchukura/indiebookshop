# Form submissions

`POST /api/bookstores/submit` handles three kinds of submission from `/submit`:

| `mode` in the Sheet row | Comes from | Email subject |
|---|---|---|
| `new` | "Submit a new bookshop" | `Bookshop Submission: {name}` |
| `change` | "Suggest changes to an existing bookshop" (free-form, picked from a list) | `Bookshop Submission: {name}` |
| `edit` | "Suggest an edit" on a shop page → `/submit?edit=<slug>` (form prefilled) | `Edit suggestion: {name} (#{id})` |

For `edit`, the route loads the shop's current data and emails only the fields that differ, as a before/after table (`lib/data/edit-diff.ts`). Formatting-only differences (state name vs abbreviation, phone punctuation, trailing slash on a website) don't count as changes.

## Where submissions go

1. **Email** to `info@bluestonebrands.com` via SendGrid (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`). Reply-to is the submitter.
2. **The Sheet's `Submissions` tab**, one row per submission, so nothing is lost if email fails.

Both are attempted every time and each fails soft: a SendGrid error or a missing tab is logged, and the submitter still sees success.

## The `Submissions` tab (create it once)

The app does **not** create this tab. Add it to the spreadsheet with this header row:

| A | B | C | D | E |
|---|---|---|---|---|
| `submitted_at` | `mode` | `bookshop_id` | `name` | `json_payload` |

- `submitted_at`: ISO timestamp (UTC)
- `mode`: `new`, `change`, or `edit`
- `bookshop_id`: the shop's id for `edit` (blank for new shops)
- `name`: the shop's name (for `edit`, its current name in the Sheet)
- `json_payload`: everything submitted, as JSON (for `edit`: the submitter, the before/after changes, and free-text hours)

The service account in `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` must have edit access to the spreadsheet (it already appends to the `Newsletter` tab).

If the tab is missing, the server logs:

```
[GoogleSheets] Could not append to the "Submissions" tab (does it exist with headers submitted_at, mode, bookshop_id, name, json_payload?): …
```

With `USE_FIXTURE_DATA=1` (tests, CI), nothing is written to the Sheet.

## Spam protection

The route is rate-limited (5 per 10 minutes per IP, `lib/rate-limit.ts`) and rejects honeypot hits (`website_url`, `lib/honeypot.ts`) with a fake success. See `docs/setup/RATE_LIMITING.md`.
