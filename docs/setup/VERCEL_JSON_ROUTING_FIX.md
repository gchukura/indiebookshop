# Vercel JSON Routing Configuration Fix

## Problem
Vercel deployment fails with error: **"Invalid route source pattern - The source property follows the syntax from path-to-regexp, not the RegExp syntax."**

## Root Cause
Mixing the old `routes` section with the modern `rewrites` section causes pattern validation errors. The `routes` section has stricter pattern matching requirements and doesn't work well with regex patterns like `(.*)`.

## Solution

### ✅ CORRECT: Use Only `rewrites` and `headers`

```json
{
  "version": 2,
  "builds": [...],
  "rewrites": [
    {
      "source": "/bookshop/:slug",
      "destination": "/api/bookshop-slug?slug=:slug"
    },
    {
      "source": "/sitemap.xml",
      "destination": "/api/sitemap.js"
    },
    {
      "source": "/api/:path*",
      "destination": "/api/serverless.js"
    }
  ],
  "headers": [
    {
      "source": "/assets/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### ❌ INCORRECT: Don't Mix `routes` and `rewrites`

```json
{
  "rewrites": [...],
  "routes": [  // ❌ This causes conflicts!
    {
      "src": "/(.*)",  // ❌ Regex patterns cause errors
      "dest": "/index.html"
    }
  ]
}
```

## Key Points

1. **Remove `routes` section entirely** - Use only `rewrites` for routing
2. **Use `headers` section** - For cache control and other headers
3. **Use `:path*` syntax** - Supported in `rewrites`, not in `routes`
4. **Avoid regex patterns** - Like `(.*)` in routes section
5. **Vercel handles static files** - No need for filesystem handle or catch-all routes

## What Vercel Does Automatically

- Serves static files from `distDir` (configured in builds)
- Handles client-side routing (SPA fallback)
- No need for explicit filesystem routes

## Date Fixed
December 22, 2025

## Related Issues
- Database egress spike (fixed with query optimization)
- Meta tag injection (fixed with proper routing)
- Route pattern validation errors (fixed by removing routes section)

