# Rate limiting and honeypot

Form and write endpoints are rate-limited per client IP, and the submission forms carry a honeypot field. Both are implemented in app code; no Vercel WAF or middleware is involved.

## Limits

| Endpoint | Limit |
|---|---|
| `POST /api/contact` | 5 per 10 minutes per IP |
| `POST /api/bookstores/submit` | 5 per 10 minutes per IP |
| `POST /api/events` | 5 per 10 minutes per IP |
| `POST /api/newsletter-signup` | 3 per 10 minutes per IP |

Each endpoint has its own bucket. Limits live in `RATE_LIMITS` in `lib/rate-limit.ts`.

Over the limit, the route returns `429` with `{ "error": "Too many requests" }` and a `Retry-After` header (seconds until a slot frees up).

The client IP is the first entry of `x-forwarded-for` (set by Vercel), or `'unknown'` if missing. All requests without the header share the `'unknown'` bucket.

## Backends

- **Upstash Redis (recommended for production).** Used when both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. It's a sliding window via `@upstash/ratelimit`, shared across all Lambda instances. Keys are prefixed `ratelimit:<endpoint>`. The free tier is plenty at current traffic.
- **In-memory (fallback).** Used when the Upstash vars are unset, or for a single request if an Upstash call throws. It's a sliding window kept in a `Map` inside one Lambda instance. **Best-effort only:** each instance counts separately and resets on cold start, so a client spread across instances can exceed the limit.

### Enabling Upstash

1. Create a Redis database at https://console.upstash.com.
2. Copy the REST URL and token into Vercel → Project → Settings → Environment Variables as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Add them to `.env.local` too if you want it locally.
3. Redeploy.

## Honeypot

`components/BookshopSubmissionForm.tsx`, `components/EventSubmissionForm.tsx` and `app/contact/page.tsx` render `<HoneypotField />`, an off-screen text input named `website_url`. It's out of the tab order and hidden from screen readers, so people never fill it.

If a request to contact, submit or events has a non-empty `website_url`, the route returns `200` with its normal success message and sends no email (`lib/honeypot.ts`). The rate limit is checked first, so bots still use up their quota.

## Testing locally

```bash
npm run dev
# 6th request within 10 minutes returns 429 (validation errors still count toward the limit)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code} retry-after=%header{retry-after}\n" \
    -X POST localhost:3000/api/contact -H 'Content-Type: application/json' -d '{}'
done

# Honeypot: 200 with the success message, no email sent
curl -s -X POST localhost:3000/api/contact -H 'Content-Type: application/json' \
  -H 'x-forwarded-for: 203.0.113.9' -d '{"website_url":"http://spam.example"}'
```
