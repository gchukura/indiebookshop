# Testing Instructions for Server-Side Meta Tags

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   Wait for the server to start (you should see "serving on port 3000")

2. **Verify server is running:**
   ```bash
   curl http://localhost:3000
   ```
   Should return HTML (not an error)

## Testing Checklist

### ✅ Test 1: Basic Canonical Tag

**URL:** `http://localhost:3000/bookshop/113-books`

**Steps:**
1. Open browser and navigate to the URL
2. Right-click → "View Page Source" (or Cmd+Option+U on Mac)
3. Search for "canonical" (Cmd+F / Ctrl+F)
4. **Expected:** You should see:
   ```html
   <link rel="canonical" href="https://indiebookshop.com/bookshop/113-books" />
   ```

**If not found:** Check server console for errors, verify data preloading is working

---

### ✅ Test 2: Multiple Bookshops

Test 3-4 different bookshop pages:

1. `/bookshop/113-books`
2. `/bookshop/powell-books` (or any slug-based URL)
3. `/bookshop/[another-slug]`

**For each:**
- View page source
- Verify canonical URL matches the slug
- Verify title contains bookshop name

---

### ✅ Test 3: Edge Cases

#### A. Bookshop with no description
- Find a bookshop without a description in your database
- Visit its page
- **Expected:** Should use template description: `"{name} is an independent bookshop in {city}, {state}..."`

#### B. Bookshop with special characters
- Find a bookshop with special characters in name (e.g., "Powell's Books")
- Visit its page
- **Expected:** Special characters should be HTML-escaped in meta tags

#### C. Invalid slug
- Visit `/bookshop/invalid-slug-that-does-not-exist`
- **Expected:** Should return 404 (no meta tags injected)

---

### ✅ Test 4: Open Graph Tags

**URL:** `http://localhost:3000/bookshop/113-books`

**Steps:**
1. View page source
2. Search for "og:title"
3. **Expected:** Should see:
   ```html
   <meta property="og:title" content="[Bookshop Name] | Independent Bookshop in [City] | IndiebookShop.com" />
   <meta property="og:description" content="[Description]" />
   <meta property="og:url" content="https://indiebookshop.com/bookshop/[slug]" />
   <meta property="og:image" content="[Image URL]" />
   <meta property="og:type" content="website" />
   ```

**Verify all OG tags are present:**
- og:title ✅
- og:description ✅
- og:url ✅
- og:image ✅
- og:type ✅
- og:site_name ✅
- og:locale ✅

---

### ✅ Test 5: Twitter Card Tags

**URL:** `http://localhost:3000/bookshop/113-books`

**Steps:**
1. View page source
2. Search for "twitter:card"
3. **Expected:** Should see:
   ```html
   <meta name="twitter:card" content="summary_large_image" />
   <meta name="twitter:title" content="[Bookshop Name] | Independent Bookshop in [City] | IndiebookShop.com" />
   <meta name="twitter:description" content="[Description]" />
   <meta name="twitter:image" content="[Image URL]" />
   <meta name="twitter:site" content="@indiebookshop" />
   ```

---

## Quick Test Script

Run the automated test script:

```bash
./test-meta-tags.sh
```

This will check for:
- Canonical tag
- OG tags
- Twitter tags
- Title tag

---

## Troubleshooting

### Meta tags not appearing?

1. **Check server logs:**
   - Look for "Preloaded data for /bookshop/..."
   - Look for "Injected meta tags for bookshop: ..."
   - Check for any errors

2. **Verify data preloading:**
   - Check if `res.locals.preloadedData` has bookshop data
   - Verify slug matching is working

3. **Check route matching:**
   - Ensure `/bookshop/:id` pattern matches slug-based URLs
   - Verify `getBookstoreBySlug()` is being called

4. **Verify HTML injection:**
   - Check that `</head>` tag exists in HTML
   - Verify middleware is running before Vite

### Common Issues

**Issue:** "No bookstore found with slug: ..."
- **Solution:** Check if the slug matches what's in your database
- Verify `generateSlugFromName()` produces the same slug as client-side

**Issue:** Meta tags appear but with wrong data
- **Solution:** Check that bookshop data is being fetched correctly
- Verify slug generation matches client-side logic

**Issue:** Duplicate meta tags
- **Solution:** This is expected - React Helmet adds tags client-side
- Search engines will use server-side tags

---

## Expected Results

### ✅ Success Criteria

After testing, you should see:

1. ✅ Canonical tag in View Page Source
2. ✅ All OG tags present
3. ✅ All Twitter tags present
4. ✅ Title tag with bookshop name
5. ✅ Meta description present
6. ✅ Works for multiple bookshops
7. ✅ Handles edge cases gracefully

### ❌ Failure Indicators

If you see:
- ❌ No canonical tag in View Page Source
- ❌ Only default meta tags (from index.html)
- ❌ Errors in server console
- ❌ 404 for valid bookshop slugs

Then check:
- Server logs for errors
- Data preloading middleware
- HTML injection middleware
- Route matching logic

---

## Next Steps After Testing

Once testing is complete:

1. **Commit changes:**
   ```bash
   git add server/metaTagGenerator.ts server/dataPreloading.ts server/htmlInjectionMiddleware.ts
   git commit -m "Add server-side meta tag injection for SEO"
   ```

2. **Deploy to production:**
   ```bash
   npm run build
   npm start
   ```

3. **Verify in production:**
   - Visit `https://indiebookshop.com/bookshop/[slug]`
   - View page source
   - Verify meta tags are present

4. **Submit to Google Search Console:**
   - Request indexing for bookshop pages
   - Monitor canonical tag recognition

---

## Questions?

If you encounter issues during testing, check:
1. Server console logs
2. Browser network tab
3. Server-side code in `server/` directory
4. Data preloading in `server/dataPreloading.ts`
5. HTML injection in `server/htmlInjectionMiddleware.ts`

