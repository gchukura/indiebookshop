# Post-Migration Testing Checklist

## ✅ Migration Complete
- [x] Slug column added to bookstores table
- [x] All bookshops have slugs
- [x] Duplicate slugs resolved
- [x] Unique constraint added
- [x] Triggers enabled
- [x] Code deployed to Vercel

## 🧪 Testing Required

### 1. Test Bookshop Page Loading
**Goal**: Verify bookshop pages load (not blank) and show content

**Test URLs** (replace with actual slugs from your database):
```bash
# Test a few different bookshops
curl -I https://www.indiebookshop.com/bookshop/fables-books
curl -I https://www.indiebookshop.com/bookshop/powell-books
curl -I https://www.indiebookshop.com/bookshop/strand-bookstore
```

**Expected**:
- Status: 200 OK
- Content-Type: text/html
- Page loads (not blank)

---

### 2. Test Meta Tags Injection
**Goal**: Verify SEO meta tags are being injected into HTML

**Test**:
```bash
# Check for canonical tag
curl -s https://www.indiebookshop.com/bookshop/fables-books | grep -i canonical

# Check for Open Graph tags
curl -s https://www.indiebookshop.com/bookshop/fables-books | grep -i "og:title\|og:description"

# Check for Twitter card
curl -s https://www.indiebookshop.com/bookshop/fables-books | grep -i "twitter:card"
```

**Expected**:
- `<link rel="canonical" href="https://www.indiebookshop.com/bookshop/[slug]" />`
- `<meta property="og:title" content="[Bookshop Name] | Independent Bookshop in [City]" />`
- `<meta name="twitter:card" content="summary_large_image" />`

---

### 3. Test Canonical URLs
**Goal**: Verify canonical URLs use www and don't redirect

**Test**:
```bash
# Check canonical URL format
curl -s https://www.indiebookshop.com/bookshop/fables-books | grep canonical

# Verify canonical doesn't redirect
curl -I $(curl -s https://www.indiebookshop.com/bookshop/fables-books | grep -oP 'href="\K[^"]*' | grep canonical | cut -d'"' -f2)
```

**Expected**:
- Canonical URL: `https://www.indiebookshop.com/bookshop/[slug]`
- No redirect (200 OK, not 307)

---

### 4. Test API Function Directly
**Goal**: Verify the serverless function is working and finding bookshops

**Test**:
```bash
# Test API endpoint directly
curl -s 'https://www.indiebookshop.com/api/bookshop-slug?slug=fables-books' | head -20

# Check response headers
curl -I 'https://www.indiebookshop.com/api/bookshop-slug?slug=fables-books'
```

**Expected**:
- Returns HTML (not JSON error)
- Contains meta tags
- x-vercel-cache: MISS (first request) or HIT (cached)

---

### 5. Test Slug Column Lookup
**Goal**: Verify the API is using the slug column (fast lookup)

**Check Vercel Function Logs**:
1. Go to Vercel Dashboard → Functions → bookshop-slug
2. Look for log messages:
   - `[Serverless] Attempting direct slug column query...`
   - `[Serverless] ✓ Found bookshop via slug column: [name]`
   - Should NOT see: `[Serverless] Using fallback: generating slugs from names...`

**Expected**:
- Direct slug query succeeds
- Fast response time (< 500ms)
- No fallback to in-memory search

---

### 6. Test Multiple Bookshops
**Goal**: Verify it works for different bookshops

**Test**:
```bash
# Test 5-10 different bookshops
for slug in fables-books powell-books strand-bookstore joseph-beth-booksellers-cincinnati; do
  echo "Testing: $slug"
  curl -s "https://www.indiebookshop.com/bookshop/$slug" | grep -q canonical && echo "✓ Has canonical" || echo "✗ Missing canonical"
done
```

**Expected**:
- All bookshops return HTML with meta tags
- No blank pages
- All have canonical URLs

---

### 7. Test Edge Cases
**Goal**: Verify edge cases work correctly

**Test**:
```bash
# Test non-existent bookshop (should return base HTML, let React handle 404)
curl -I https://www.indiebookshop.com/bookshop/this-does-not-exist-12345

# Test bookshop with special characters in name (if any)
# Check a bookshop that had duplicate slug issues
curl -s https://www.indiebookshop.com/bookshop/joseph-beth-booksellers-cincinnati | grep canonical
```

**Expected**:
- Non-existent: Returns 200 with base HTML (React handles 404)
- Special characters: Slug works correctly
- Previously duplicate slugs: All resolve correctly

---

### 8. Test Browser Rendering
**Goal**: Verify pages render correctly in browser

**Manual Test**:
1. Open browser DevTools (F12)
2. Visit: `https://www.indiebookshop.com/bookshop/fables-books`
3. Check:
   - Page loads (not blank)
   - No JavaScript errors in console
   - Meta tags visible in "View Page Source"
   - Canonical URL correct
   - Open Graph preview works (test in social media preview tool)

**Expected**:
- Page renders correctly
- No console errors
- Meta tags in page source
- Social preview shows correct title/description

---

### 9. Test Performance
**Goal**: Verify lookup is fast (slug column should be much faster)

**Test**:
```bash
# Time the API response
time curl -s 'https://www.indiebookshop.com/api/bookshop-slug?slug=fables-books' > /dev/null
```

**Expected**:
- Response time < 1 second
- Much faster than before (was doing in-memory search)

---

### 10. Test Redirects
**Goal**: Verify legacy URL redirects still work

**Test**:
```bash
# Test old /bookstore/ route redirect
curl -I https://www.indiebookshop.com/bookstore/123

# Should redirect to /bookshop/123
```

**Expected**:
- 301 redirect from `/bookstore/:id` → `/bookshop/:id`
- Then client-side redirect to slug URL

---

## 🐛 If Tests Fail

### Blank Page / No Meta Tags
1. Check Vercel function logs for errors
2. Verify slug exists in database: `SELECT slug FROM bookstores WHERE slug = 'fables-books';`
3. Check if direct slug query is working in logs

### Canonical URL Issues
1. Verify BASE_URL is `https://www.indiebookshop.com` in all files
2. Check for redirect loops
3. Verify canonical doesn't redirect

### Slow Performance
1. Check if fallback method is being used (should use direct slug query)
2. Check database query performance
3. Verify index exists: `SELECT * FROM pg_indexes WHERE tablename = 'bookstores' AND indexname = 'idx_bookstores_slug';`

---

## ✅ Success Criteria

All tests should pass:
- [ ] Bookshop pages load (not blank)
- [ ] Meta tags are injected
- [ ] Canonical URLs are correct (www, no redirects)
- [ ] API function uses slug column (fast lookup)
- [ ] Multiple bookshops work
- [ ] Edge cases handled
- [ ] Browser rendering works
- [ ] Performance is good (< 1s)
- [ ] Redirects work

