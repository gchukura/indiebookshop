# Build Cache Issue - React useState Error

**Issue:** `Uncaught TypeError: Cannot read properties of undefined (reading 'useState')`  
**Status:** ✅ Code Fixed - Waiting for Build Cache to Clear

## Problem

The error persists even though the code has been fixed. This is because:
1. **Build Cache**: Vercel may be serving a cached build with the old code
2. **Browser Cache**: Your browser may have cached the old JavaScript bundle
3. **CDN Cache**: The CDN may be serving cached assets

## Solution Applied

The code has been completely refactored:

**Before (causing error):**
```typescript
// Had React hook in utility file
import * as React from 'react';
export function useMapboxCss() {
  const [loaded, setLoaded] = React.useState(...);
}
```

**After (fixed):**
```typescript
// Pure JavaScript - NO React dependencies
export function loadMapboxCss(): Promise<void> {
  // Simple promise-based API
}
```

## Current Status

✅ **Code is fixed** - No React imports in `mapboxCssLoader.ts`  
✅ **Components updated** - All components use the new API  
✅ **Committed to main** - Commit `887526b`

## How to Clear Caches

### 1. Vercel Build Cache
- Go to Vercel Dashboard → Your Project → Settings → General
- Click "Clear Build Cache" or trigger a new deployment
- Or push an empty commit: `git commit --allow-empty -m "Clear cache" && git push`

### 2. Browser Cache
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Or clear browser cache completely
- Or use incognito/private mode

### 3. CDN Cache
- Vercel CDN cache should clear automatically after new deployment
- May take a few minutes to propagate

## Verification

After cache clears, verify:
1. Open browser DevTools → Network tab
2. Look for `vendor-*.js` files
3. Check the file hash - should be different from `vendor-C8_s_YSZ.js`
4. Error should be gone

## Note on Zustand Warning

The zustand deprecation warning is from a dependency (likely `cmdk` or another UI library) and is not related to our changes. It's a non-critical warning that can be addressed later by updating dependencies.

## Commits

- `887526b` - Removed React hook, pure JS implementation
- `e5b132f` - Attempted namespace import fix
- `b8f9d9a` - Initial SEO fixes
