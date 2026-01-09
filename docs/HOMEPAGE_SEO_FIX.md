# Homepage SEO Content Injection Issue

## Status
- ✅ Directory page: Working
- ✅ About page: Working
- ✅ Contact page: Working
- ✅ Events page: Working
- ✅ Blog page: Working
- ❌ Homepage: Not working (still cached or not routing correctly)

## Problem
The homepage route `/` is not getting SEO content injected, even though other static pages work correctly.

## Possible Causes

1. **Vercel Cache**: Homepage is being served from cache (`x-vercel-cache: HIT`)
2. **Rewrite Rule Order**: The catch-all `"source": "/(.*)"` might be matching `/` before the specific `/` route
3. **Static File Serving**: Vercel might be serving `index.html` directly for `/` before checking rewrite rules

## Solutions Tried

1. ✅ Created `api/static-pages.js` serverless function
2. ✅ Added `/` route to `vercel.json` rewrites
3. ✅ Improved pathname detection in the function
4. ✅ Reordered rewrite rules (moved `/` to end before catch-all)

## Next Steps

1. **Check Vercel Function Logs**: Verify if `api/static-pages.js` is being called for `/`
   - Look for `[Static Pages] Requested pathname: /` in logs
   - If no logs, function isn't being called

2. **Alternative Approach**: If function isn't being called, we might need to:
   - Use a different route pattern (e.g., `/home` then redirect)
   - Handle homepage differently in the catch-all
   - Use Edge Middleware (but we know that doesn't work)

3. **Cache Bypass**: Try accessing with query parameter to bypass cache:
   - `https://www.indiebookshop.com/?v=timestamp`

## Current Configuration

```json
{
  "source": "/",
  "destination": "/api/static-pages.js"
}
```

This should work, but Vercel might be serving the static file before checking rewrites.
