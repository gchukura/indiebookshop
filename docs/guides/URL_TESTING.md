# URL Pattern Testing Guide

## Quick Test Instructions

### Test 1: `/bookshop/powell-books` (Slug-based - Should load normally)

**In Browser:**
1. Navigate to: `http://localhost:3000/bookshop/powell-books`
2. **Expected**: Page loads normally, no redirects
3. **Check Page Source** (Right-click → View Page Source):
   - Look for: `<link rel="canonical" href="https://indiebookshop.com/bookshop/powell-books" />`
   - Verify H1 tag: `<h1>...bookshop name...</h1>`

**Using curl:**
```bash
curl -I http://localhost:3000/bookshop/powell-books
# Expected: 200 OK

curl -s http://localhost:3000/bookshop/powell-books | grep -i canonical
# Expected: <link rel="canonical" href="https://indiebookshop.com/bookshop/powell-books" />
```

---

### Test 2: `/bookshop/123` (Numeric ID - Should redirect to slug)

**In Browser (with DevTools):**
1. Open DevTools (F12) → Network tab
2. Navigate to: `http://localhost:3000/bookshop/123` (replace 123 with actual bookshop ID)
3. **Expected**:
   - Network tab shows: `GET /api/bookstores/123` → 200 OK
   - URL in address bar changes to slug version (e.g., `/bookshop/powell-books`)
   - No page reload (client-side redirect)
4. **Check Page Source**:
   - Canonical tag should be slug-based (NOT `/bookshop/123`)
   - Example: `<link rel="canonical" href="https://indiebookshop.com/bookshop/powell-books" />`

**Using curl:**
```bash
curl -I http://localhost:3000/bookshop/123
# Expected: 200 OK (redirect happens in browser, not server)

curl -s http://localhost:3000/bookshop/123 | grep -i canonical
# Expected: Canonical tag with slug URL (not /bookshop/123)
```

---

### Test 3: `/bookstore/123` (Old Route - Should 301 to /bookshop/123, then to slug)

**In Browser (with DevTools):**
1. Open DevTools (F12) → Network tab
2. Navigate to: `http://localhost:3000/bookstore/123` (replace 123 with actual bookshop ID)
3. **Expected in Network Tab**:
   - First request: `GET /bookstore/123` → Status **301** (Permanent Redirect)
   - Response header: `Location: /bookshop/123`
   - Second request: `GET /bookshop/123` → Status **200**
   - Then client-side redirect to slug URL
4. **Final URL**: Should be slug-based (e.g., `/bookshop/powell-books`)
5. **Check Page Source**:
   - Canonical tag should be slug-based

**Using curl:**
```bash
# Follow redirects to see the chain
curl -I -L http://localhost:3000/bookstore/123
# Expected: 
# HTTP/1.1 301 Moved Permanently
# Location: /bookshop/123
# ...then 200 OK...

# Check canonical tag
curl -s -L http://localhost:3000/bookstore/123 | grep -i canonical
# Expected: Canonical tag with slug URL
```

---

## Verification Checklist

### ✅ Canonical Tags
- [ ] All three URL patterns show the **same canonical URL** (slug-based)
- [ ] Canonical URL format: `https://indiebookshop.com/bookshop/[slug]`
- [ ] Canonical tag is in the `<head>` section
- [ ] Canonical URL does NOT contain numeric IDs

### ✅ H1 Tags
- [ ] H1 tag exists on bookshop detail pages
- [ ] H1 contains the bookshop name
- [ ] H1 is visible in page source
- [ ] Only one H1 per page

### ✅ Redirects
- [ ] `/bookstore/123` → 301 redirect to `/bookshop/123`
- [ ] `/bookshop/123` → Client-side redirect to slug
- [ ] Final URLs are always slug-based
- [ ] No broken links or 404 errors

---

## Answers to Your Questions

### 1. Are all bookshops guaranteed to have slugs?

**✅ YES** - Slugs are generated dynamically from bookshop names using `generateSlugFromName()`. 

- **No database dependency**: Slugs are computed on-the-fly, not stored
- **Always available**: As long as a bookshop has a `name` field, it will have a slug
- **Fallback behavior**: If name is missing/empty, page shows error and redirects to `/directory` (appropriate)

**No additional fallback needed** - the current implementation handles this correctly.

### 2. What happens with spaces/special characters in slugs?

**✅ ALL HANDLED CORRECTLY** - Tested and verified:

| Special Character | Example | Result | Status |
|------------------|---------|--------|--------|
| Apostrophe (`'`) | `"Powell's Books"` | `"powells-books"` | ✅ Removed |
| Ampersand (`&`) | `"Barnes & Noble"` | `"barnes-noble"` | ✅ Removed |
| Parentheses | `"Bookshop (Downtown)"` | `"bookshop-downtown"` | ✅ Removed |
| Exclamation | `"Book's & More!"` | `"books-more"` | ✅ Removed |
| Multiple spaces | `"The Book Shop"` | `"the-book-shop"` | ✅ Normalized |
| Leading/trailing | `"  Bookshop  "` | `"bookshop"` | ✅ Trimmed |

**All edge cases tested and passing! ✅**

---

## Implementation Summary

### ✅ What's Implemented

1. **Canonical Tags**: Always use slug-based URLs, regardless of access method
2. **Numeric ID Redirects**: Client-side redirects preserve SEO value
3. **Old Route Redirects**: Server-side 301 redirects for `/bookstore/` routes
4. **Slug Generation**: Handles all special characters correctly
5. **H1 Tags**: Present and functional (line 194 in BookshopDetailPage.tsx)

### ✅ Code Locations

- **Canonical URL Logic**: `client/src/pages/BookshopDetailPage.tsx` (lines 131-138)
- **Numeric ID Detection**: `client/src/pages/BookshopDetailPage.tsx` (line 25)
- **Redirect Logic**: `client/src/pages/BookshopDetailPage.tsx` (lines 44-57)
- **Server Redirects**: `server/redirectMiddleware.ts` (lines 174-195)
- **Slug Generation**: `client/src/lib/linkUtils.ts` (lines 26-33)

---

## Next Steps

1. **Deploy** the changes
2. **Wait 24-48 hours** for search engines to crawl
3. **Run Ahrefs crawl** to verify canonical tags
4. **Monitor** for any 404s or broken links
5. **Submit sitemap** update to Google Search Console

---

## Troubleshooting

### Issue: Canonical tag shows numeric ID
**Solution**: Check that `canonicalUrl` uses `generateSlugFromName(bookshop.name)`, not the URL parameter

### Issue: Redirect not working
**Solution**: 
- Check browser console for errors
- Verify bookshop data is loaded
- Check that `isNumericId` detection is working

### Issue: 404 on numeric ID
**Solution**: 
- Verify bookshop ID exists in database
- Check API endpoint `/api/bookstores/:id` is working
- Verify redirect middleware is applied

---

## Test Scripts

Run automated tests:
```bash
# Test slug generation
node test-slug-generation.js

# Test redirects (requires server running)
./test-redirects.sh
```

All tests should pass! ✅

