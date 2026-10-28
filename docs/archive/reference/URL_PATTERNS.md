# URL Pattern Testing Guide

This document describes how to test the three URL patterns for bookshop detail pages.

## Test Cases

### 1. `/bookshop/powell-books` (Slug-based URL - Canonical)
**Expected Behavior:**
- Page loads normally
- No redirects occur
- Canonical tag: `<link rel="canonical" href="https://indiebookshop.com/bookshop/powell-books" />`
- API call: `GET /api/bookstores/by-slug/powell-books`

**How to Test:**
1. Navigate to `http://localhost:3000/bookshop/powell-books`
2. Check browser console - should see API call to `/api/bookstores/by-slug/powell-books`
3. Check page source - should see canonical tag with slug URL
4. Verify page displays bookshop details

---

### 2. `/bookshop/123` (Numeric ID - Legacy URL)
**Expected Behavior:**
- Page initially loads with numeric ID
- Client-side redirect occurs to slug-based URL
- Redirect uses `replace: true` (doesn't add to browser history)
- Final URL: `/bookshop/powell-books` (or appropriate slug)
- Canonical tag always points to slug URL

**How to Test:**
1. Navigate to `http://localhost:3000/bookshop/123` (replace 123 with actual bookshop ID)
2. Check browser console:
   - Should see API call to `/api/bookstores/123`
   - Should see redirect to slug URL
3. Check Network tab - should see redirect (status 200, then location change)
4. Final URL should be slug-based
5. Check page source - canonical tag should point to slug URL

**Note:** Replace `123` with an actual bookshop ID from your database.

---

### 3. `/bookstore/123` (Old Route - Legacy URL)
**Expected Behavior:**
- Server-side 301 redirect to `/bookshop/123`
- Then client-side redirect to slug-based URL
- Final URL: `/bookshop/powell-books` (or appropriate slug)
- Two-step redirect: `/bookstore/123` → `/bookshop/123` → `/bookshop/powell-books`

**How to Test:**
1. Navigate to `http://localhost:3000/bookstore/123` (replace 123 with actual bookshop ID)
2. Check browser Network tab:
   - First request: `GET /bookstore/123` → Status 301 (Permanent Redirect)
   - Location header: `/bookshop/123`
   - Second request: `GET /bookshop/123` → Status 200
   - Then client-side redirect to slug URL
3. Final URL should be slug-based
4. Check page source - canonical tag should point to slug URL

**Note:** Replace `123` with an actual bookshop ID from your database.

---

## Testing Commands

### Using curl (for server-side redirects):

```bash
# Test 1: Slug-based URL (should return 200)
curl -I http://localhost:3000/bookshop/powell-books

# Test 2: Numeric ID (should return 200, client handles redirect)
curl -I http://localhost:3000/bookshop/123

# Test 3: Old bookstore route (should return 301 redirect)
curl -I http://localhost:3000/bookstore/123
# Should see: Location: /bookshop/123
```

### Using Browser DevTools:

1. Open Chrome/Firefox DevTools
2. Go to Network tab
3. Navigate to each URL
4. Check:
   - Status codes
   - Redirect chains
   - Final URL
   - Response headers

### Verify Canonical Tags:

```bash
# Extract canonical tag from page
curl -s http://localhost:3000/bookshop/powell-books | grep -i canonical
curl -s http://localhost:3000/bookshop/123 | grep -i canonical
curl -s http://localhost:3000/bookstore/123 | grep -i canonical
```

All should show the same canonical URL (slug-based).

---

## Expected Results Summary

| URL Pattern | Server Response | Client Redirect | Final URL | Canonical Tag |
|------------|----------------|-----------------|-----------|---------------|
| `/bookshop/powell-books` | 200 OK | None | `/bookshop/powell-books` | `/bookshop/powell-books` |
| `/bookshop/123` | 200 OK | Yes (to slug) | `/bookshop/powell-books` | `/bookshop/powell-books` |
| `/bookstore/123` | 301 → `/bookshop/123` | Yes (to slug) | `/bookshop/powell-books` | `/bookshop/powell-books` |

---

## Troubleshooting

### Issue: Numeric ID doesn't redirect
- Check browser console for errors
- Verify the bookshop data is loaded
- Check that `generateSlugFromName` is working correctly

### Issue: `/bookstore/123` doesn't redirect
- Check server logs for redirect middleware
- Verify the route pattern matches: `/^\/bookstore\/(\d+)$/`
- Check that redirectMiddleware is applied before other routes

### Issue: Canonical tag is wrong
- Verify `canonicalUrl` in BookshopDetailPage uses `generateSlugFromName`
- Check that it's not using the URL parameter directly
- Ensure bookshop data is loaded before rendering SEO component

