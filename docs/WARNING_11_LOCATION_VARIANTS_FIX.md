# Warning #11 Fix: Location Variant Redirects

**Date:** January 3, 2026  
**Issue:** Orphan pages - location variants  
**Status:** ✅ Fixed

## Problem

Location-specific URLs (e.g., `/bookshop/name-city`) were orphaned pages that could be indexed by search engines. These non-canonical URLs didn't redirect to the canonical slug-based URLs, creating duplicate content issues.

## Solution

Implemented server-side 301 redirects for location variant URLs to their canonical slug-based URLs. This ensures:
1. Search engines consolidate link equity to canonical URLs
2. Users are automatically redirected to the correct page
3. No duplicate content penalties

## Implementation

### 1. Server-Side Redirect Middleware (`server/redirectMiddleware.ts`)

Added `createRedirectMiddleware()` factory function that:
- Detects location variant URLs (slugs with multiple hyphens)
- Tries to find the bookshop by progressively removing parts from the end
- Redirects to canonical slug if found

**Example:**
- Request: `/bookshop/powells-books-portland`
- Tries: `powells-books-portland` → `powells-books` → `powells`
- Finds: `powells-books` matches a bookshop
- Redirects: `301 /bookshop/powells-books`

### 2. Vercel Edge Middleware (`middleware.ts`)

Added location variant redirect logic to Edge Middleware for serverless environments:
- Same progressive slug matching logic
- Returns 301 redirects before meta tag injection
- Handles requests at the edge for better performance

### 3. Client-Side Fallback (`client/src/pages/BookshopDetailPage.tsx`)

Client-side redirect logic already existed and continues to work as a fallback:
- Handles cases where server-side redirect might not catch
- Uses React Router's `setLocation` with `replace: true`

## Code Changes

### `server/redirectMiddleware.ts`

```typescript
/**
 * Try to find a bookshop by trying different slug variations
 */
async function findBookshopBySlugVariations(
  slug: string,
  storage: IStorage
): Promise<{ bookshop: any; matchedSlug: string } | null> {
  // Try the full slug first
  let bookshop = await storage.getBookstoreBySlug(slug);
  if (bookshop) {
    return { bookshop, matchedSlug: slug };
  }

  // Try progressively removing parts from the end
  const parts = slug.split('-');
  for (let i = parts.length - 1; i >= 1; i--) {
    const baseSlug = parts.slice(0, i).join('-');
    if (baseSlug && baseSlug.length > 0) {
      bookshop = await storage.getBookstoreBySlug(baseSlug);
      if (bookshop) {
        return { bookshop, matchedSlug: baseSlug };
      }
    }
  }

  return null;
}
```

### `middleware.ts`

Similar logic added to Edge Middleware for serverless environments.

## Testing

### Manual Testing

1. **Location Variant Redirect:**
   ```bash
   curl -I https://indiebookshop.com/bookshop/powells-books-portland
   # Should return: 301 Moved Permanently
   # Location: /bookshop/powells-books
   ```

2. **Canonical URL:**
   ```bash
   curl -I https://indiebookshop.com/bookshop/powells-books
   # Should return: 200 OK (no redirect)
   ```

3. **Numeric ID:**
   ```bash
   curl -I https://indiebookshop.com/bookshop/123
   # Should return: 200 OK (handled by client-side redirect)
   ```

## Benefits

1. **SEO:** Consolidates link equity to canonical URLs
2. **User Experience:** Automatic redirects to correct pages
3. **Performance:** Server-side redirects are faster than client-side
4. **Crawl Budget:** Reduces duplicate content for search engines

## Edge Cases Handled

1. **Multiple Hyphens:** Handles `name-books-city-state` patterns
2. **Not Found:** If no bookshop matches, request passes through to 404 handler
3. **Exact Match:** If location variant matches canonical, no redirect needed
4. **Numeric IDs:** Skipped (handled separately by client-side redirect)

## Backward Compatibility

- Existing canonical URLs continue to work
- Client-side redirects remain as fallback
- No breaking changes to existing functionality

## Future Improvements

1. **Caching:** Cache slug variation lookups to reduce database queries
2. **Analytics:** Track location variant redirects to identify common patterns
3. **Precomputation:** Pre-compute canonical slugs for all bookshops
