# Sitemap Configuration - Important Notes

## The Problem
The sitemap at `/sitemap.xml` keeps breaking because of incorrect rewrite destination patterns.

## The Root Cause
**When using explicit `builds` section in vercel.json, Vercel serverless functions ARE accessed WITH the `.js` extension in rewrite destinations.**

- ✅ CORRECT: `"destination": "/api/sitemap.js"` (when using builds section)
- ❌ WRONG: `"destination": "/api/sitemap"` (this doesn't work with explicit builds)

**Note:** This is different from Vercel's auto-detection mode. When you explicitly list files in the `builds` section, the rewrite destination must include the `.js` extension to match the built function.

## Why This Keeps Breaking
1. **Documentation had wrong pattern** - `docs/setup/VERCEL_JSON_ROUTING_FIX.md` showed `/api/sitemap.js` as correct
2. **Inconsistent patterns** - Other rewrites in `vercel.json` use `.js` extensions, creating confusion
3. **No comments** - No documentation in the code explaining this pattern

## The Fix (Applied)
1. ✅ Fixed `vercel.json` rewrite: `/api/sitemap.js` (WITH `.js` - required when using builds section)
2. ✅ Created `api/sitemap.vercel.json` to specify Node.js runtime
3. ✅ Updated documentation to reflect correct pattern for explicit builds
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
- **When using explicit `builds` section:** Use `/api/{function-name}.js` (WITH `.js`) in rewrite destinations
- **When using auto-detection:** Use `/api/{function-name}` (without `.js`)
- Match the pattern of other working functions in your `vercel.json`
- Create a `{function-name}.vercel.json` file if needed for runtime configuration

## Date Fixed
January 3, 2026

