# Phase 1 Testing Plan - Supabase Migration

## Prerequisites

### 1. Environment Variables Setup

**Create/verify `.env` file in project root:**

```bash
# Supabase Configuration (REQUIRED for testing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional - to force Supabase usage
USE_SUPABASE_STORAGE=true
```

**Get your Supabase credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API
4. Copy **Project URL** → `SUPABASE_URL`
5. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Start Development Server

```bash
npm run dev
```

**Expected output:**
```
serving on port 3000
Using Supabase storage implementation
```

**⚠️ If you see "Using Google Sheets storage implementation":**
- Check that `SUPABASE_URL` is set in `.env`
- Verify the URL format is correct (starts with `https://`)

---

## Testing Checklist

### ✅ Test 1: Verify Supabase is Being Used

**Goal:** Confirm the server is using Supabase, not Google Sheets

**Steps:**
1. Start server: `npm run dev`
2. Check console output for:
   ```
   ✅ "Using Supabase storage implementation"
   ❌ NOT "Using Google Sheets storage implementation"
   ```

**If Google Sheets is shown:**
- Check `.env` file exists and has `SUPABASE_URL`
- Restart the server after adding env vars
- Verify no typos in variable names

---

### ✅ Test 2: API Endpoints - Get All Bookstores

**URL:** `http://localhost:3000/api/bookstores`

**Test Methods:**

**A. Browser:**
1. Open `http://localhost:3000/api/bookstores`
2. Should see JSON array of bookstores
3. Check browser console (F12) for errors

**B. cURL:**
```bash
curl http://localhost:3000/api/bookstores | jq '.[0]'
```

**Expected:**
- Returns array of bookstore objects
- Each bookstore has: `id`, `name`, `city`, `state`, `description`, etc.
- No errors in server console

**Verify:**
- Data comes from Supabase (check server logs)
- Response time is fast (< 500ms typically)

---

### ✅ Test 3: API Endpoints - Get Single Bookstore

**URL:** `http://localhost:3000/api/bookstores/:id`

**Steps:**
1. Get a bookstore ID from Test 2 (e.g., ID `1`)
2. Visit: `http://localhost:3000/api/bookstores/1`
3. Should see single bookstore object

**Expected:**
- Returns one bookstore object
- All fields populated correctly
- No 404 errors

---

### ✅ Test 4: API Endpoints - Get Bookstore by Slug

**URL:** `http://localhost:3000/api/bookstores/slug/:slug`

**Steps:**
1. Get a bookstore name from Test 2
2. Convert to slug (e.g., "Powell's Books" → "powells-books")
3. Visit: `http://localhost:3000/api/bookstores/slug/powells-books`
4. Should return the bookstore

**Expected:**
- Returns bookstore matching the slug
- Slug mapping works correctly
- No errors

**Test multiple slugs:**
- Try different bookstore names
- Test with special characters (they should be removed in slug)

---

### ✅ Test 5: API Endpoints - Filtered Bookstores

**URL:** `http://localhost:3000/api/bookstores/filter?state=CA`

**Test Cases:**

**A. Filter by State:**
```bash
curl "http://localhost:3000/api/bookstores/filter?state=CA"
```

**B. Filter by City:**
```bash
curl "http://localhost:3000/api/bookstores/filter?city=San%20Francisco"
```

**C. Filter by Features:**
```bash
curl "http://localhost:3000/api/bookstores/filter?features=1,2"
```

**D. Combined Filters:**
```bash
curl "http://localhost:3000/api/bookstores/filter?state=CA&city=San%20Francisco"
```

**Expected:**
- Returns filtered results
- Filters work correctly
- No errors

---

### ✅ Test 6: API Endpoints - Get Features

**URL:** `http://localhost:3000/api/features`

**Steps:**
1. Visit: `http://localhost:3000/api/features`
2. Should see array of features

**Expected:**
- Returns array of feature objects
- Each has `id` and `name`
- Data from Supabase

---

### ✅ Test 7: API Endpoints - Get Events

**URL:** `http://localhost:3000/api/events`

**Steps:**
1. Visit: `http://localhost:3000/api/events`
2. Should see array of events

**Expected:**
- Returns array of event objects
- Each has `id`, `bookshopId`, `title`, `description`, `date`, `time`
- Data from Supabase

---

### ✅ Test 8: Sitemap Generation (CRITICAL - Phase 1 Priority)

**URL:** `http://localhost:3000/sitemap.xml`

**Steps:**
1. Visit: `http://localhost:3000/sitemap.xml`
2. Should see XML sitemap

**Expected XML Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://indiebookshop.com/</loc>
    <priority>1.0</priority>
    ...
  </url>
  <url>
    <loc>https://indiebookshop.com/bookshop/[slug]</loc>
    ...
  </url>
  ...
</urlset>
```

**Verify:**
- ✅ XML is valid (no parse errors)
- ✅ Contains static pages (/, /about, /directory, etc.)
- ✅ Contains bookshop pages (`/bookshop/[slug]`)
- ✅ All bookshop slugs are present
- ✅ No errors in server console

**Test with cURL:**
```bash
curl http://localhost:3000/sitemap.xml | head -20
```

**Check for errors:**
- Look for "Serverless: Error generating sitemap" in console
- Verify SupabaseStorage is being used (check logs)

---

### ✅ Test 9: Frontend Pages - Directory Page

**URL:** `http://localhost:3000/directory`

**Steps:**
1. Open in browser
2. Check browser console (F12) for errors
3. Verify bookstores load on the map/list

**Expected:**
- Page loads without errors
- Bookstores appear on map
- Filters work (state, city, features)
- No console errors about missing data

**Check Network Tab:**
- `/api/bookstores` request succeeds
- Response time is reasonable
- Data structure matches expected format

---

### ✅ Test 10: Frontend Pages - Bookshop Detail Page

**URL:** `http://localhost:3000/bookshop/:slug`

**Steps:**
1. Get a slug from Test 4 or sitemap
2. Visit: `http://localhost:3000/bookshop/powells-books` (example)
3. Should see bookshop detail page

**Expected:**
- Page loads with bookshop information
- All details displayed correctly
- No 404 errors
- Slug routing works

---

### ✅ Test 11: Server Console Verification

**While running tests, monitor server console for:**

**✅ Good Signs:**
```
Serverless: Using Supabase storage implementation
Serverless: Initializing bookshop slug mappings from Supabase...
Serverless: Created X slug mappings for bookshops
```

**❌ Warning Signs:**
```
Serverless: Supabase client not available
Serverless: Error fetching bookstores from Supabase
Serverless: Using Google Sheets storage implementation
```

**Action if warnings appear:**
- Check `.env` file has correct variables
- Verify Supabase credentials are valid
- Check Supabase project is active

---

### ✅ Test 12: Performance Check

**Goal:** Verify Supabase is faster than Google Sheets

**Steps:**
1. Time API responses:
   ```bash
   time curl -s http://localhost:3000/api/bookstores > /dev/null
   ```

2. Compare response times:
   - **Supabase:** Typically < 500ms
   - **Google Sheets:** Typically > 1000ms

**Expected:**
- Fast response times (< 500ms for most endpoints)
- No timeout errors
- Consistent performance

---

## Troubleshooting

### Issue: "Using Google Sheets storage implementation"

**Solution:**
1. Check `.env` file exists in project root
2. Verify `SUPABASE_URL` is set and correct
3. Restart server after adding env vars
4. Check for typos: `SUPABASE_URL` (not `SUPABASE_URI`)

### Issue: "Supabase client not available"

**Solution:**
1. Verify `SUPABASE_URL` starts with `https://`
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check Supabase project is active
4. Test credentials in Supabase Dashboard

### Issue: Sitemap returns error

**Solution:**
1. Check server console for specific error
2. Verify Supabase connection works (Test 2)
3. Check that bookstores exist in Supabase
4. Verify `api/supabase-storage-serverless.js` is correct

### Issue: API endpoints return empty arrays

**Solution:**
1. Check Supabase Dashboard → Table Editor
2. Verify `bookstores` table has data with `live = true`
3. Check server console for Supabase errors
4. Verify table names match (should be `bookstores`, not `bookshops`)

---

## Success Criteria

- [ ] Server starts with "Using Supabase storage implementation"
- [ ] All API endpoints return data (not empty arrays)
- [ ] Sitemap generates successfully with bookshop URLs
- [ ] Frontend pages load without errors
- [ ] No Google Sheets API calls in server logs
- [ ] Response times are fast (< 500ms)
- [ ] No Supabase connection errors

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 1 is complete
2. Ready to deploy to Vercel
3. Verify Vercel environment variables are set
4. Monitor production logs after deployment

If tests fail:
1. Check troubleshooting section
2. Verify Supabase setup
3. Review server console errors
4. Fix issues before proceeding

