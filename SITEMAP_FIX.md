# Sitemap Configuration - Important Notes

## The Problem
The sitemap at `/sitemap.xml` keeps breaking because of incorrect rewrite destination patterns.

## The Root Cause
**Vercel serverless functions are accessed WITHOUT the `.js` extension in rewrite destinations.**

- ❌ WRONG: `"destination": "/api/sitemap.js"`
- ✅ CORRECT: `"destination": "/api/sitemap"`

The file is `api/sitemap.js`, but the route is `/api/sitemap`.

## Why This Keeps Breaking
1. **Documentation had wrong pattern** - `docs/setup/VERCEL_JSON_ROUTING_FIX.md` showed `/api/sitemap.js` as correct
2. **Inconsistent patterns** - Other rewrites in `vercel.json` use `.js` extensions, creating confusion
3. **No comments** - No documentation in the code explaining this pattern

## The Fix (Applied)
1. ✅ Fixed `vercel.json` rewrite: `/api/sitemap` (no `.js`)
2. ✅ Fixed documentation: Updated `VERCEL_JSON_ROUTING_FIX.md`
3. ✅ Added comment in `vercel.json` explaining the pattern
4. ✅ Verified middleware doesn't interfere (it runs on original path, not rewritten path)

## How to Verify It's Working
After deployment, test:
```bash
curl -I https://www.indiebookshop.com/sitemap.xml
```

Should return:
- Status: 200
- Content-Type: application/xml; charset=utf-8

## Future Prevention
- Always use `/api/{function-name}` (no `.js`) in rewrite destinations
- The file is `api/{function-name}.js` but the route is `/api/{function-name}`
- When in doubt, check Vercel docs or test locally

## Date Fixed
January 3, 2026

