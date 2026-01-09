# Location Variant Redirects Implementation (Warning #11)

## Status: ✅ Implemented in Edge Middleware

## Overview

Location variant URLs (e.g., `/bookshop/powells-books-portland`) are now redirected to their canonical URLs (e.g., `/bookshop/powells-books`) via server-side 301 redirects in Edge Middleware.

## Implementation Details

### Files Modified

1. **`middleware.ts`**:
   - Added `findBookshopBySlugVariations()` function
   - Added location variant redirect logic before meta tag injection
   - Redirects happen at the Edge Middleware level (production)

### How It Works

1. **Detection**: When a request comes in for `/bookshop/{slug}`, the middleware checks if the slug looks like a location variant (has 2+ hyphens).

2. **Lookup**: The `findBookshopBySlugVariations()` function:
   - First tries the full slug (e.g., `powells-books-portland`)
   - If not found, progressively removes parts from the end:
     - `powells-books-portland` → try `powells-books`
     - `powells-books` → try `powells`
   - Returns the first matching bookshop and the matched slug

3. **Redirect**: If a bookshop is found and the requested slug doesn't match the canonical slug (generated from the bookshop name), a 301 redirect is issued to the canonical URL.

### Code Flow

```typescript
// In middleware.ts, before meta tag injection:
if (pathname.startsWith('/bookshop/')) {
  const requestedSlug = pathname.split('/').pop();
  
  // Skip numeric IDs (handled client-side)
  if (/^\d+$/.test(requestedSlug)) {
    return new Response(null, { status: 200 });
  }
  
  // Check if location variant (2+ hyphens)
  const parts = requestedSlug.split('-');
  if (parts.length >= 2) {
    const result = await findBookshopBySlugVariations(requestedSlug);
    if (result) {
      const { bookshop, matchedSlug } = result;
      const canonicalSlug = generateSlugFromName(bookshop.name);
      
      // Redirect if not canonical
      if (canonicalSlug && requestedSlug !== canonicalSlug) {
        return Response.redirect(`${url.origin}/bookshop/${canonicalSlug}`, 301);
      }
    }
  }
  
  // Continue to meta tag injection...
}
```

## Testing

### Manual Test

Test a location variant URL:
```bash
curl -I -k "https://www.indiebookshop.com/bookshop/powells-books-portland"
```

Expected result:
- Status: `301 Moved Permanently`
- Location header: `https://www.indiebookshop.com/bookshop/powells-books`

### Automated Test

The test script `test-seo-reapplication.sh` includes a test for location variant redirects:

```bash
./test-seo-reapplication.sh
```

Test #10 checks:
- Location variant URL redirects to canonical URL
- Status code is 301
- Redirect location matches expected canonical slug

## Benefits

1. **SEO**: Search engines see server-side 301 redirects, consolidating link equity to canonical URLs
2. **Performance**: Redirects happen at the Edge (CDN level), faster than client-side redirects
3. **Crawl Budget**: Prevents search engines from indexing duplicate location variant URLs
4. **User Experience**: Users are automatically redirected to the canonical URL

## Complementing Existing Redirects

This implementation complements:
- **Client-side redirects** in `BookshopDetailPage.tsx` (handles edge cases)
- **Server-side redirects** in `server/redirectMiddleware.ts` (development only)

## Edge Cases Handled

1. **Numeric IDs**: Skipped (handled by client-side redirect)
2. **No Match Found**: Passes through to meta tag injection (no redirect)
3. **Already Canonical**: No redirect if requested slug matches canonical slug
4. **Errors**: Catches errors and continues to meta tag injection (graceful degradation)

## Deployment

After deployment, verify:
1. Location variant URLs redirect (301) to canonical URLs
2. Canonical URLs still work (no redirect)
3. Meta tags are still injected correctly
4. No performance degradation

## Related Issues

- **Ahrefs Warning #11**: Orphan pages - location variants
- **Status**: ✅ Fixed (server-side redirects in production)
