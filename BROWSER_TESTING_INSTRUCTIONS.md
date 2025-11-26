# Browser Testing Instructions for URL Patterns & Canonical Tags

## ✅ Code Verification (Already Complete)

The canonical tag implementation is **CORRECT**:

- ✅ Uses `BASE_URL = 'https://indiebookshop.com'` (NOT localhost)
- ✅ Always generates slug-based URLs
- ✅ Never uses numeric IDs in canonical tags

## 🧪 Browser Testing Steps

### Prerequisites
1. Start the dev server: `npm run dev`
2. Server should be running on `http://localhost:3000`

---

### Test 1: `/bookshop/powells-books` (Slug-based URL)

**Steps:**
1. Open browser and navigate to: `http://localhost:3000/bookshop/powells-books`
2. **Expected**: Page loads normally, no redirects
3. **Verify Canonical Tag**:
   - Right-click on page → **View Page Source** (or Cmd+Option+U on Mac)
   - Press Cmd+F (or Ctrl+F) and search for: `canonical`
   - **Expected Result**: 
     ```html
     <link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />
     ```
   - ✅ Should use `https://indiebookshop.com` (NOT `http://localhost:3000`)
   - ✅ Should use slug `/bookshop/powells-books` (NOT numeric ID)

**Alternative Method (DevTools):**
1. Open DevTools (F12)
2. Go to **Elements** tab
3. Expand `<head>` section
4. Look for: `<link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />`

---

### Test 2: `/bookshop/123` (Numeric ID - Should redirect to slug)

**Steps:**
1. Open browser and navigate to: `http://localhost:3000/bookshop/123`
   - **Note**: Replace `123` with an actual bookshop ID from your database
2. **Expected Behavior**:
   - Page loads initially with numeric ID
   - URL in address bar changes to slug version (e.g., `/bookshop/powells-books`)
   - No page reload (client-side redirect)
3. **Check Network Tab** (DevTools → Network):
   - Should see: `GET /api/bookstores/123` → Status 200
   - Then client-side redirect happens
4. **Verify Canonical Tag** (after redirect):
   - View Page Source
   - Search for: `canonical`
   - **Expected Result**:
     ```html
     <link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />
     ```
   - ✅ Should use `https://indiebookshop.com` (NOT localhost)
   - ✅ Should use slug (NOT `/bookshop/123`)

---

### Test 3: `/bookstore/123` (Old Route - Should 301 to /bookshop/123, then to slug)

**Steps:**
1. Open browser DevTools (F12) → **Network** tab
2. Navigate to: `http://localhost:3000/bookstore/123`
   - **Note**: Replace `123` with an actual bookshop ID
3. **Expected in Network Tab**:
   - **First Request**: `GET /bookstore/123`
     - Status: **301 Moved Permanently**
     - Response Headers: `Location: /bookshop/123`
   - **Second Request**: `GET /bookshop/123`
     - Status: **200 OK**
   - Then client-side redirect to slug URL
4. **Final URL**: Should be slug-based (e.g., `/bookshop/powells-books`)
5. **Verify Canonical Tag** (after all redirects):
   - View Page Source
   - Search for: `canonical`
   - **Expected Result**:
     ```html
     <link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />
     ```
   - ✅ Should use `https://indiebookshop.com` (NOT localhost)
   - ✅ Should use slug (NOT numeric ID)

---

## ✅ Verification Checklist

For each test, verify:

- [ ] **Canonical URL Format**: `https://indiebookshop.com/bookshop/[slug]`
- [ ] **NOT using localhost**: Should NOT be `http://localhost:3000/...`
- [ ] **NOT using numeric ID**: Should NOT be `/bookshop/123`
- [ ] **Using slug**: Should be `/bookshop/powells-books` (or appropriate slug)
- [ ] **In `<head>` section**: Canonical tag should be in the page `<head>`

---

## 🔍 How to Find Canonical Tag in Browser

### Method 1: View Page Source
1. Right-click on page → **View Page Source**
2. Press Cmd+F (Mac) or Ctrl+F (Windows)
3. Search for: `canonical`
4. Look for: `<link rel="canonical" href="...">`

### Method 2: DevTools Elements Tab
1. Open DevTools (F12)
2. Go to **Elements** tab
3. Expand `<head>` section
4. Look for `<link>` tags
5. Find the one with `rel="canonical"`

### Method 3: DevTools Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Run:
   ```javascript
   document.querySelector('link[rel="canonical"]')?.href
   ```
4. Should return: `https://indiebookshop.com/bookshop/[slug]`

---

## 📋 Expected Results Summary

| URL Pattern | Server Response | Client Redirect | Final URL | Canonical Tag |
|------------|----------------|-----------------|-----------|---------------|
| `/bookshop/powells-books` | 200 OK | None | `/bookshop/powells-books` | `https://indiebookshop.com/bookshop/powells-books` |
| `/bookshop/123` | 200 OK | Yes (to slug) | `/bookshop/powells-books` | `https://indiebookshop.com/bookshop/powells-books` |
| `/bookstore/123` | 301 → `/bookshop/123` | Yes (to slug) | `/bookshop/powells-books` | `https://indiebookshop.com/bookshop/powells-books` |

**All three patterns should show the SAME canonical URL!**

---

## ⚠️ Troubleshooting

### Issue: Canonical tag shows localhost
**Solution**: Check that `BASE_URL` in `client/src/lib/seo.ts` is set to `'https://indiebookshop.com'`

### Issue: Canonical tag shows numeric ID
**Solution**: Verify that `canonicalUrl` uses `generateSlugFromName(bookshop.name)`, not the URL parameter

### Issue: Can't find canonical tag
**Solution**: 
- Make sure you're viewing the page source (not inspecting element)
- The canonical tag is added client-side via React Helmet
- Try the DevTools Console method above

### Issue: Page doesn't load
**Solution**: 
- Make sure server is running: `npm run dev`
- Check browser console for errors
- Verify bookshop exists in database

---

## ✅ Success Criteria

All three URL patterns should:
1. ✅ Load successfully (or redirect properly)
2. ✅ Show canonical tag with format: `https://indiebookshop.com/bookshop/[slug]`
3. ✅ NOT use localhost in canonical URL
4. ✅ NOT use numeric ID in canonical URL
5. ✅ Use the same canonical URL regardless of access method

If all checks pass, the implementation is working correctly! 🎉

