# URL Pattern Testing - Implementation Verification

## Code Review Summary

### ✅ Implementation Status

All three URL patterns have been implemented correctly:

1. **`/bookshop/powell-books`** (Slug-based - Canonical)
   - ✅ Route: `/bookshop/:idslug` accepts slug
   - ✅ API: Calls `/api/bookstores/by-slug/powell-books`
   - ✅ Canonical: Always uses slug-based URL from `generateSlugFromName(bookshop.name)`
   - ✅ No redirects needed

2. **`/bookshop/123`** (Numeric ID - Legacy)
   - ✅ Detection: Regex `/^\d+$/` identifies numeric IDs
   - ✅ API: Calls `/api/bookstores/123` (by ID endpoint)
   - ✅ Redirect: Client-side redirect to slug using `setLocation(canonicalUrl, { replace: true })`
   - ✅ Canonical: Always uses slug-based URL (not the numeric ID)

3. **`/bookstore/123`** (Old Route - Legacy)
   - ✅ Server Redirect: Middleware redirects `/bookstore/123` → `/bookshop/123` (301)
   - ✅ Client Redirect: Then redirects `/bookshop/123` → `/bookshop/powell-books` (slug)
   - ✅ Two-step redirect chain preserves SEO value

## Key Implementation Details

### Canonical URL Logic
```typescript
// Always uses slug-based URL, never numeric ID
const canonicalUrl = useMemo(() => {
  if (!bookshop) return "";
  const canonicalSlug = generateSlugFromName(bookshop.name);
  return `${BASE_URL}/bookshop/${canonicalSlug}`;
}, [bookshop]);
```

### Numeric ID Detection & Redirect
```typescript
const isNumericId = /^\d+$/.test(bookshopSlug);

useEffect(() => {
  if (bookshop && isNumericId) {
    const canonicalSlug = generateSlugFromName(bookshop.name);
    const canonicalUrl = `/bookshop/${canonicalSlug}`;
    
    if (bookshopSlug !== canonicalSlug) {
      setLocation(canonicalUrl, { replace: true });
    }
  }
}, [bookshop, isNumericId, bookshopSlug, setLocation]);
```

### Server-Side Redirect Middleware
```typescript
// Case 9: /bookstore/123 → /bookshop/123 (301 redirect)
if (path.match(/^\/bookstore\/(\d+)$/)) {
  const bookstoreId = path.split('/').pop();
  return res.redirect(301, `/bookshop/${bookstoreId}`);
}
```

## Testing Instructions

### Manual Testing (Browser)

1. **Test `/bookshop/powell-books`**:
   - Navigate to: `http://localhost:3000/bookshop/powell-books`
   - Expected: Page loads, no redirects
   - Check: Canonical tag in `<head>` should be `/bookshop/powell-books`

2. **Test `/bookshop/123`** (replace 123 with actual ID):
   - Navigate to: `http://localhost:3000/bookshop/123`
   - Expected: Page loads, then URL changes to slug version
   - Check: Network tab shows API call to `/api/bookstores/123`
   - Check: Final URL should be slug-based
   - Check: Canonical tag should be slug-based (not `/bookshop/123`)

3. **Test `/bookstore/123`** (replace 123 with actual ID):
   - Navigate to: `http://localhost:3000/bookstore/123`
   - Expected: 301 redirect to `/bookshop/123`, then client redirect to slug
   - Check: Network tab shows:
     - First request: `GET /bookstore/123` → Status 301
     - Location header: `/bookshop/123`
     - Second request: `GET /bookshop/123` → Status 200
     - Then client-side redirect to slug URL
   - Check: Final URL should be slug-based
   - Check: Canonical tag should be slug-based

### Automated Testing (curl)

```bash
# Test 1: Slug-based URL
curl -I http://localhost:3000/bookshop/powell-books
# Expected: 200 OK

# Test 2: Numeric ID (client-side redirect, so 200 OK)
curl -I http://localhost:3000/bookshop/123
# Expected: 200 OK (redirect happens in browser)

# Test 3: Old bookstore route (server-side 301)
curl -I http://localhost:3000/bookstore/123
# Expected: 301 Moved Permanently
# Location: /bookshop/123
```

### Verify Canonical Tags

```bash
# All should show the same canonical URL (slug-based)
curl -s http://localhost:3000/bookshop/powell-books | grep -i canonical
curl -s http://localhost:3000/bookshop/123 | grep -i canonical
curl -s http://localhost:3000/bookstore/123 | grep -i canonical
```

## Expected Behavior Summary

| URL | Server Response | Client Redirect | Final URL | Canonical Tag |
|-----|----------------|-----------------|-----------|---------------|
| `/bookshop/powell-books` | 200 OK | None | `/bookshop/powell-books` | `/bookshop/powell-books` |
| `/bookshop/123` | 200 OK | Yes (to slug) | `/bookshop/powell-books` | `/bookshop/powell-books` |
| `/bookstore/123` | 301 → `/bookshop/123` | Yes (to slug) | `/bookshop/powell-books` | `/bookshop/powell-books` |

## Notes

- All canonical tags point to slug-based URLs
- Numeric IDs are automatically converted to slugs
- Old `/bookstore/` routes are redirected via 301
- Client-side redirects use `replace: true` to avoid polluting browser history
- SEO value is preserved through proper redirect chains

## Next Steps

1. Start the dev server: `npm run dev`
2. Test each URL pattern manually in a browser
3. Verify canonical tags are correct
4. Check that redirects work as expected
5. Verify no duplicate content issues remain

