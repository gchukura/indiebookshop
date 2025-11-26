# Fix: Numeric ID URLs Redirecting to /directory Instead of Slug URLs

## Problem
- URL pattern `/bookshop/123` (numeric ID) was redirecting to `/directory` instead of `/bookshop/[slug]`
- This broke backward compatibility for external links using numeric IDs

## Root Cause
The redirect logic had a race condition:
1. The redirect `useEffect` only ran when `bookshop` data existed
2. If the API call failed or was still loading, `bookshop` would be `null`
3. The error handling `useEffect` would then redirect to `/directory` for numeric IDs (incorrectly)
4. The redirect logic didn't wait for the query to complete successfully

## Solution

### 1. Added Query Success Tracking
- Added `isSuccessBookshop` to track when the query succeeds
- Added `throwOnError: false` to prevent React Query from throwing errors

### 2. Fixed Redirect Logic
- Redirect now only runs when:
  - Query is successful (`isSuccessBookshop`)
  - Bookshop data exists (`bookshop`)
  - It's a numeric ID (`isNumericId`)
  - Query is not loading (`!isLoadingBookshop`)
  - Query is not in error state (`!isErrorBookshop`)

### 3. Improved Error Handling
- Numeric IDs that fail now show a helpful error message instead of auto-redirecting to `/directory`
- Only slug-based URLs that fail redirect to `/directory`
- Added console.logs for debugging

## Code Changes

### Before
```typescript
useEffect(() => {
  if (bookshop && isNumericId) {
    // Redirect logic
  }
}, [bookshop, isNumericId, bookshopSlug, setLocation]);
```

### After
```typescript
useEffect(() => {
  if (isSuccessBookshop && bookshop && isNumericId && !isLoadingBookshop && !isErrorBookshop) {
    // Redirect logic with early return
    setLocation(canonicalUrl, { replace: true });
    return; // Prevent multiple redirects
  }
}, [bookshop, isNumericId, bookshopSlug, setLocation, isLoadingBookshop, isSuccessBookshop, isErrorBookshop]);
```

## Expected Behavior

### ✅ Working Flow
1. User visits `/bookshop/123`
2. App fetches bookshop with ID 123 from database
3. App gets the bookshop name, generates slug
4. App redirects to `/bookshop/powell-books` (or whatever the slug is)

### ✅ Error Flow (Numeric ID Not Found)
1. User visits `/bookshop/999` (non-existent ID)
2. API returns 404
3. App shows error message: "Bookshop with ID 999 not found"
4. User can click "Browse Directory" or "Go Back"
5. **NO auto-redirect to `/directory`**

### ✅ Error Flow (Slug Not Found)
1. User visits `/bookshop/invalid-slug`
2. API returns 404
3. App redirects to `/directory` (correct behavior for invalid slugs)

## Testing

After fix, verify these all work:

- ✅ `/bookshop/powell-books` - loads page normally
- ✅ `/bookshop/123` - redirects to `/bookshop/[correct-slug]`
- ✅ `/bookstore/123` - 301 to `/bookshop/123`, then to slug
- ✅ `/bookshop/999` (non-existent) - shows error, doesn't redirect to `/directory`

## Debugging

Console logs added:
- `[BookshopDetailPage] Numeric ID detected, redirecting to slug:` - when redirect starts
- `[BookshopDetailPage] Redirecting:` - shows from/to URLs
- `[BookshopDetailPage] Slug-based URL failed, redirecting to directory:` - when slug fails

## Files Modified

1. **client/src/pages/BookshopDetailPage.tsx**
   - Added `isSuccessBookshop` tracking
   - Fixed redirect logic to wait for successful query
   - Improved error handling for numeric IDs
   - Added console.logs for debugging

