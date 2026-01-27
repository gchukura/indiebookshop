# Branch Review Report: `fix-nextjs-routing-and-map`

## Summary
Branch is **up to date** with `main` - no merge conflicts detected.

## ✅ Security Review

### Good Practices Found:
1. **API Keys Protected**: 
   - `GOOGLE_PLACES_API_KEY` only used server-side in `/api/place-photo`
   - `MAPBOX_ACCESS_TOKEN` exposed via `/api/config` but with validation (checks for `pk.` prefix)
   - All keys use environment variables, not hardcoded

2. **SQL Injection Protection**:
   - All queries use Supabase client with parameterized queries (`.eq()`, `.ilike()`, etc.)
   - No raw SQL or string concatenation in queries
   - Input validation in API routes (photo_reference length, maxwidth range)

3. **Input Validation**:
   - `/api/place-photo`: Validates photo_reference (10-2000 chars), maxwidth (1-1600)
   - `/api/bookstores/[id]/events`: Validates ID is numeric
   - `/api/config`: Validates Mapbox token format

### Security Recommendations:
1. **Mapbox Token**: Currently exposed to client (required for Mapbox GL JS). Ensure:
   - Token is restricted in Mapbox dashboard to your domain(s)
   - Token has minimal scopes (styles:read, fonts:read only)
   - Rate limits are set in Mapbox dashboard
   - ✅ Code already includes warning if token doesn't start with `pk.`

2. **Google Places API**: 
   - ✅ Properly proxied through `/api/place-photo` (key never exposed to client)
   - ✅ Input validation prevents abuse

## ⚠️ Performance Review

### Issues Found:

1. **`getStates()` Performance Concern**:
   - **Issue**: Fetches ALL bookstores with pagination (could be 3000+ rows) just to extract unique states
   - **Impact**: Slow on first load, unnecessary data transfer
   - **Recommendation**: Consider using `SELECT DISTINCT state` if Supabase supports it, or cache the result more aggressively
   - **Current**: Uses React `cache()` which helps, but still fetches all rows on cache miss

2. **`getRandomBookstores()` Limit**:
   - **Issue**: Fetches up to 100 bookstores, shuffles in-memory, then takes 8
   - **Impact**: Fetches 12.5x more data than needed
   - **Status**: Acceptable trade-off for randomization quality

3. **`getBookstoreBySlug()` Multiple Fallback Queries**:
   - **Issue**: Can execute up to 3-4 queries if slug not found (exact match → case-insensitive → name search → partial name)
   - **Impact**: Slower for edge cases, but good for user experience
   - **Status**: Acceptable for robustness

### Good Practices:
- ✅ Pagination implemented for `getAllBookstores()` and `getStates()`
- ✅ Column selection optimized (LIST_COLUMNS vs FULL_DETAIL)
- ✅ React `cache()` used to deduplicate requests
- ✅ `Promise.all()` used for parallel fetching where possible

## 🔄 Breaking Changes Review

### API Routes (New):
1. **`/api/config`** - NEW endpoint
   - Returns: `{ mapboxAccessToken: string }`
   - No breaking changes (new endpoint)

2. **`/api/features`** - NEW endpoint
   - Returns: `Feature[]` with numeric IDs
   - No breaking changes (new endpoint)

3. **`/api/bookstores/filter`** - NEW endpoint
   - Query params: `state`, `city`, `county`, `features`
   - Returns: `Bookstore[]`
   - No breaking changes (new endpoint)

4. **`/api/bookstores/[id]/events`** - NEW endpoint
   - Returns: `Event[]`
   - No breaking changes (new endpoint)

5. **`/api/place-photo`** - NEW endpoint
   - Query params: `photo_reference`, `maxwidth`
   - Returns: Image binary
   - No breaking changes (new endpoint)

### Component Changes:
1. **New Components**:
   - `BookshopImage.tsx` - Client component for image error handling
   - `RelatedBookshops.tsx` - Client component for nearby bookshops
   - `SingleLocationMap.tsx` - Client component for map display
   - `StateFlag.tsx` - Client component for state flags
   - `Providers.tsx` - QueryClientProvider wrapper

2. **Modified Components**:
   - `DirectoryClient.tsx` - Added search filter, features filter (commented out)
   - `BookshopDetailClient.tsx` - Added features, events, photos, reviews, map
   - `page.tsx` (homepage) - Added image thumbnails, improved state display

### Data Fetching Changes:
1. **`getStates()`** - Now uses pagination (behavior change, but not breaking)
2. **`getFilteredBookstores()`** - No changes
3. **`getBookstoreBySlug()`** - Enhanced fallback logic (backward compatible)
4. **`LIST_COLUMNS`** - Added `google_photos` and `imageUrl` (additive, not breaking)

### Potential Breaking Changes:
**NONE DETECTED** - All changes are:
- Additive (new endpoints, new components)
- Backward compatible (enhanced fallbacks, new optional features)
- Internal improvements (pagination, error handling)

## 📊 Merge Readiness

### Status: ✅ **READY TO MERGE**

### Pre-Merge Checklist:
- ✅ No merge conflicts
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ Security review passed
- ⚠️ Performance: `getStates()` could be optimized but not blocking
- ✅ No breaking changes detected
- ✅ All new API routes properly documented
- ✅ Environment variables documented in code

### Recommendations Before Merge:
1. **Performance**: Consider optimizing `getStates()` to use DISTINCT query or add longer cache TTL
2. **Testing**: Verify all new API endpoints work in production
3. **Environment Variables**: Ensure all required env vars are set:
   - `MAPBOX_ACCESS_TOKEN`
   - `GOOGLE_PLACES_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Notes

- Branch has 19 commits ahead of main
- All commits are feature additions and bug fixes
- No destructive changes detected
- Code follows Next.js 15+ patterns (async params, proper client/server boundaries)
