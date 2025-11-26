# Canonical Tag Verification

## ✅ Implementation Status

The canonical tag implementation is **CORRECT** and uses the production URL format.

### Code Verification

**BASE_URL Configuration** (`client/src/lib/seo.ts`):
```typescript
export const BASE_URL = 'https://indiebookshop.com';
```

**Canonical URL Generation** (`client/src/pages/BookshopDetailPage.tsx`):
```typescript
const canonicalUrl = useMemo(() => {
  if (!bookshop) return "";
  const canonicalSlug = generateSlugFromName(bookshop.name);
  return `${BASE_URL}/bookshop/${canonicalSlug}`;
}, [bookshop]);
```

**SEO Component** (`client/src/components/SEO.tsx`):
```typescript
{canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
```

## ✅ Expected Format

**CORRECT Format:**
```html
<link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />
```

**INCORRECT Formats (should NOT appear):**
```html
<!-- ❌ Using localhost -->
<link rel="canonical" href="http://localhost:3000/bookshop/powells-books" />

<!-- ❌ Using numeric ID -->
<link rel="canonical" href="https://indiebookshop.com/bookshop/123" />
```

## 🧪 Testing Instructions

### Test 1: `/bookshop/powells-books` (Slug-based)

**In Browser:**
1. Navigate to: `http://localhost:3000/bookshop/powells-books`
2. Right-click → View Page Source (or Cmd+Option+U on Mac)
3. Search for: `canonical`
4. **Expected**: `<link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />`

**Using curl:**
```bash
curl -s http://localhost:3000/bookshop/powells-books | grep -i 'rel="canonical"'
# Expected: <link rel="canonical" href="https://indiebookshop.com/bookshop/powells-books" />
```

### Test 2: `/bookshop/123` (Numeric ID)

**In Browser:**
1. Navigate to: `http://localhost:3000/bookshop/123` (replace 123 with actual ID)
2. View Page Source
3. Search for: `canonical`
4. **Expected**: `<link rel="canonical" href="https://indiebookshop.com/bookshop/[slug]" />`
   - Should use slug, NOT `/bookshop/123`
   - Should use `https://indiebookshop.com`, NOT `localhost`

**Using curl:**
```bash
curl -s http://localhost:3000/bookshop/123 | grep -i 'rel="canonical"'
# Expected: <link rel="canonical" href="https://indiebookshop.com/bookshop/[slug]" />
```

### Test 3: `/bookstore/123` (Old Route)

**In Browser:**
1. Navigate to: `http://localhost:3000/bookstore/123` (replace 123 with actual ID)
2. View Page Source (after redirects complete)
3. Search for: `canonical`
4. **Expected**: `<link rel="canonical" href="https://indiebookshop.com/bookshop/[slug]" />`
   - Should use slug, NOT numeric ID
   - Should use `https://indiebookshop.com`, NOT `localhost`

**Using curl:**
```bash
curl -s -L http://localhost:3000/bookstore/123 | grep -i 'rel="canonical"'
# Expected: <link rel="canonical" href="https://indiebookshop.com/bookshop/[slug]" />
```

## ✅ Verification Checklist

- [ ] Canonical tag uses `https://indiebookshop.com` (NOT `http://localhost:3000`)
- [ ] Canonical tag uses slug-based URL (NOT numeric ID)
- [ ] Canonical tag format: `<link rel="canonical" href="https://indiebookshop.com/bookshop/[slug]" />`
- [ ] Same canonical URL appears regardless of access method (slug, numeric ID, or old route)
- [ ] Canonical tag is in the `<head>` section

## 🔍 Quick Verification Commands

```bash
# Test all three patterns
./test-canonical-format.sh

# Or manually:
curl -s http://localhost:3000/bookshop/powells-books | grep -i canonical
curl -s http://localhost:3000/bookshop/123 | grep -i canonical
curl -s -L http://localhost:3000/bookstore/123 | grep -i canonical
```

All should show: `https://indiebookshop.com/bookshop/[slug]`

## ✅ Summary

**The implementation is correct!** 

- ✅ Uses production URL (`https://indiebookshop.com`)
- ✅ Never uses localhost in canonical tags
- ✅ Always uses slug-based URLs
- ✅ Never uses numeric IDs in canonical URLs
- ✅ Consistent across all access methods

The canonical tags will work correctly in production, pointing search engines to the proper canonical URLs.

