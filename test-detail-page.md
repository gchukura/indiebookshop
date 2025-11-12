# Bookshop Detail Page Test Plan

## Code Verification ✅

### 1. Slug Generation
- ✅ `generateSlugFromName()` correctly converts bookshop names to URL-friendly slugs
- ✅ Special characters are removed, spaces become hyphens
- ✅ Test cases verified: "Powell's Books" → "powells-books"

### 2. API Endpoint
- ✅ Route exists: `/api/bookstores/by-slug/:slug`
- ✅ Route is registered BEFORE `/api/bookstores/:id` (important for route matching)
- ✅ Storage implementations have `getBookstoreBySlug()` method
- ✅ Returns 404 if bookshop not found, 500 on error

### 3. React Query Configuration
- ✅ Default `queryFn` uses `fetch(queryKey[0])` 
- ✅ Query key format: `/api/bookstores/by-slug/${bookshopSlug}`
- ✅ Enabled only when `bookshopSlug` exists
- ✅ Error handling redirects to `/directory` on error

### 4. Component Structure
- ✅ Uses `useParams` to get `idslug` from route
- ✅ Fetches bookshop by slug
- ✅ Fetches features and events separately
- ✅ SEO component included with proper metadata
- ✅ Canonical URL uses slug format

### 5. Link Updates
- ✅ `Home.tsx` uses slug-based links
- ✅ `Events.tsx` uses slug-based links  
- ✅ `Directory.tsx` already uses slug-based links
- ✅ All other directory pages use slug-based links

## Testing Steps

### Manual Testing (when server is running):

1. **Test API Endpoint Directly:**
   ```bash
   # Get a list of bookstores first
   curl http://localhost:5000/api/bookstores
   
   # Test with a real slug (replace with actual bookshop name slug)
   curl http://localhost:5000/api/bookstores/by-slug/powells-books
   ```

2. **Test Frontend Page:**
   - Navigate to: `http://localhost:5000/bookshop/powells-books`
   - Verify page loads without errors
   - Check browser console for any errors
   - Verify SEO metadata is present

3. **Test Navigation:**
   - Go to homepage, click on a featured bookshop
   - Go to directory, click on a bookshop
   - Go to events page, click on a bookshop name
   - All should navigate to slug-based URLs

## Potential Issues to Watch For

1. **Slug Collisions:** If two bookshops have the same name, slugs will collide
   - Solution: Storage should handle this (check `getBookstoreBySlug` implementation)

2. **Special Characters:** Names with special characters need proper slug generation
   - ✅ Already handled by `generateSlugFromName()`

3. **Case Sensitivity:** Slugs should be case-insensitive
   - ✅ Handled by converting to lowercase

4. **404 Handling:** If slug doesn't match, should show error or redirect
   - ✅ Component shows error message and redirects on error

## Expected Behavior

✅ **Working Flow:**
1. User clicks link: `/bookshop/powells-books`
2. Component extracts slug: `powells-books`
3. Fetches: `/api/bookstores/by-slug/powells-books`
4. API looks up bookshop by slug
5. Returns bookshop data
6. Component renders with SEO metadata

❌ **Error Flow:**
1. User clicks link: `/bookshop/invalid-slug`
2. Component extracts slug: `invalid-slug`
3. Fetches: `/api/bookstores/by-slug/invalid-slug`
4. API returns 404
5. Component shows error message
6. Redirects to `/directory` after error

