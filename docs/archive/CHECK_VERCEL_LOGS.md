# How to Check Vercel Logs for Edge Middleware

## Quick Access

1. Go to https://vercel.com/dashboard
2. Select your project: **indiebookshop**
3. Click on the latest deployment
4. Click the **"Functions"** tab
5. Look for **"Edge Middleware"** in the function list
6. Click on it to view logs

## What to Look For

### If Edge Middleware is Running:
You should see logs like:
- `[Edge Middleware] Successfully fetched /index.html for /`
- `[Edge Middleware] Cached HTML for /, length: 3146`
- `[Edge Middleware] Injecting SEO content for /`

### If Edge Middleware is Failing:
You might see:
- `[Edge Middleware] Error fetching /index.html: ...`
- `[Edge Middleware] Failed to fetch HTML for /, status: 404`
- `[Edge Middleware] Cannot fetch HTML for /, passing through`
- `[Edge Middleware] Invalid HTML for /, length: 0`

### If Edge Middleware Isn't Running:
- No logs at all for Edge Middleware
- Only logs from other functions (like `api/bookshop-slug.js`)

## Current Status (from debug script)

- ✅ Homepage loads (200 OK)
- ❌ SEO content marker NOT found
- ❌ <noscript> block NOT found
- ❌ H1 tag NOT found in noscript block
- ✅ Root div found (HTML structure is correct)
- Response shows `x-vercel-cache: HIT` (cached response)

## Possible Issues

1. **Edge Middleware not executing**: The matcher might not be matching the routes
2. **Fetch failing**: The fetch from `/index.html` might be failing
3. **Passing through**: Edge Middleware might be returning `new Response(null, { status: 200 })` which passes through to static file serving
4. **Cache issue**: The cached response might be from before the SEO content was added

## Next Steps Based on Logs

### If logs show "Successfully fetched" but content isn't appearing:
- Check if the HTML injection is working
- Verify the `injectSeoBodyContent` function is being called
- Check if the HTML structure matches what we expect

### If logs show "Failed to fetch" or "Cannot fetch":
- Edge Middleware can't access static files
- Need to switch to serverless function approach (like `api/bookshop-slug.js`)

### If no logs at all:
- Edge Middleware might not be running
- Check the matcher configuration
- Verify the middleware file is being deployed

## Alternative: Check via Vercel CLI

If you have Vercel CLI installed:
```bash
vercel logs --follow
```

Or for a specific deployment:
```bash
vercel logs [deployment-url]
```
