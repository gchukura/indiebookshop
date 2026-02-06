# Comprehensive Rebuild Plan: IndiebookShop.com

## Executive Summary

Rebuild indiebookshop.com from scratch using optimized architecture patterns, addressing critical weaknesses identified in performance diagnostics, SEO audits, and cost analysis. The new architecture should prioritize server-side rendering, efficient data fetching, modern UX patterns, and strong SEO fundamentals.

## Architecture Comparison: Current vs. Target Architecture

### Data Fetching & Caching Strategy

**Current IndiebookShop:**

- Uses `React cache()` for request deduplication only
- Each page fetches data independently (no shared processing layer)
- No build-time data processing/caching
- Multiple separate queries per page (featured, popular, states, etc.)
- Client-side React Query for some data fetching (adds latency)

**Target architecture (optimized):**

- Uses `unstable_cache()` with strategic revalidation (3600s = 1 hour)
- Single `getProcessedBookstoreData()` function that processes ALL data once per build
- Build-time data processing creates efficient lookup Maps (byCity, byCounty, byType, byAmenity)
- All pages share the same cached processed data structure
- Client-side hooks (`useBreweries`) only for interactive filtering, not initial data load

**Key Difference:** The target architecture processes all data once and reuses it across 500+ pages, while IndiebookShop processes data separately for each page.

### Data Processing Architecture

**Current IndiebookShop:**

```typescript
// Each page fetches independently
export const getRandomBookstores = cache(async (count) => {
  // Direct Supabase query
  // Processes data inline
  // No shared processing layer
});
```

**Target architecture (optimized):**

```typescript
// Single processing function for all pages
export const getProcessedBookstoreData = unstable_cache(
  async (): Promise<ProcessedBookstoreData> => {
    const bookstores = await getAllBookstoreData(); // Cached
    const processed = await processBookstoreData(bookstores); // Creates Maps
    return ensureMapsAreMaps(processed); // Handles serialization
  },
  ['processed-bookstore-data'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

// All pages use the same processed data
export const getBookstoresByCity = unstable_cache(
  async (city: string) => {
    const processedData = await getProcessedBookstoreData(); // Shared cache
    return safeMapGet(processedData.byCity, city.toLowerCase()) || [];
  },
  ['bookstores-by-city'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);
```

**Key Difference:** The target architecture creates efficient lookup structures (Maps) once, while IndiebookShop queries the database repeatedly.

### Page Generation Strategy

**Current IndiebookShop:**

- Uses `generateStaticParams` but processes data per page
- No shared metadata generation utilities
- Limited ISR revalidation strategy
- Each dynamic route fetches data independently

**Target architecture (optimized):**

- `generateStaticParams` uses shared processed data
- Comprehensive SEO utilities (`generateBookstoreTitle`, `generateEnhancedBookstoreDescription`)
- Consistent revalidation strategy (3600s across all pages)
- Dynamic routes leverage pre-processed lookup Maps

**Key Difference:** The target architecture has a unified SEO/content generation system, while IndiebookShop generates metadata per-page without shared utilities.

### Sitemap Generation

**Current IndiebookShop:**

- Basic sitemap generation
- May fetch data multiple times during sitemap generation

**Target architecture (optimized):**

- Comprehensive sitemap (`sitemap.ts`) that uses shared `getProcessedBookstoreData()`
- Generates URLs for all entity types (breweries, cities, counties, amenities, types, regions)
- Filters out empty pages (only includes cities/counties with breweries)
- Uses same cached data as pages, ensuring consistency

**Key Difference:** The target architecture's sitemap is comprehensive and uses shared cached data, ensuring all pages are discoverable.

### Component Architecture

**Current IndiebookShop:**

- Mix of server and client components
- Some components fetch data client-side unnecessarily
- Limited separation of concerns

**Target architecture (optimized):**

- Clear separation: Server Components fetch data, Client Components handle interactivity
- Client components receive pre-fetched data as props
- Minimal client-side data fetching (only for interactive features like filtering)
- Template components (`SimpleBookstorePageTemplate`) for consistent page structure

**Key Difference:** The target architecture has a clear server/client boundary with data fetching on the server, while IndiebookShop mixes concerns.

### Error Handling & Resilience

**Current IndiebookShop:**

- Basic error handling
- Some functions may throw without graceful fallbacks

**Target architecture (optimized):**

- Comprehensive error handling with fallbacks
- `safeMapGet()` handles Map serialization issues
- `ensureMapsAreMaps()` handles cache serialization edge cases
- Graceful degradation when data is missing

**Key Difference:** The target architecture handles edge cases (cache serialization, missing data) gracefully, while IndiebookShop may fail unexpectedly.

## Current Architecture Weaknesses (Documented)

### Performance Issues

1. **Expensive computations on every render** - State processing, filtering operations run on every render
2. **Inefficient algorithms** - O(n²) complexity in featured bookshops selection, multiple array passes
3. **Client-side data fetching** - All 3000+ bookshops loaded client-side, causing slow initial load
4. **Missing memoization** - Large objects/arrays created inline, no proper caching strategy
5. **Supabase egress costs** - Was $270/month, optimized to $4-10/month but can be better
6. **No shared data processing layer** - Each page processes data independently instead of once per build

### SEO Issues (Partially Fixed)

1. **0% href coverage** - Fixed with Next.js migration but needs optimization
2. **Client-side rendering** - Initial load was 4-6 seconds, now improved but can be better
3. **Missing structured data** - Partially implemented, needs comprehensive coverage
4. **No shared SEO utilities** - Metadata generation duplicated across pages

### Architectural Issues

1. **Mixed architecture** - Both Express server and Next.js App Router coexisting
2. **Legacy client code** - Old React + Vite + Wouter code still exists alongside Next.js
3. **Inefficient data fetching** - Multiple queries, N+1 problems, no proper batching
4. **No proper caching layer** - React cache() used but no strategic caching strategy
5. **No data processing layer** - Missing the `getProcessedBookstoreData()` pattern that powers 500+ pages efficiently

## Target Architecture (Based on Best Practices)

### Core Principles

1. **Server-First Rendering** - All pages server-rendered with ISR/SSG where appropriate
2. **Efficient Data Fetching** - Single queries, proper batching, strategic caching
3. **Progressive Enhancement** - Core functionality works without JS, enhanced with JS
4. **Performance Budget** - Target < 2s LCP, < 100ms TBT, 90+ Lighthouse scores
5. **SEO Excellence** - 100% href coverage, comprehensive structured data, perfect meta tags

### Tech Stack Recommendations

**Core Framework:**

- Next.js 15+ (App Router) - Server Components by default
- React 19+ - Latest features, improved performance
- TypeScript - Strict mode, comprehensive types

**Data Layer:**

- Supabase (PostgreSQL) - Keep existing database
- React Server Components - Direct database queries, no API layer overhead
- Strategic caching - Next.js cache(), Redis for frequently accessed data
- Optimized queries - Column selection, pagination, indexes

**UI/UX:**

- Tailwind CSS - Utility-first styling
- shadcn/ui - Accessible component library
- Framer Motion - Smooth animations (when needed)
- React Query - Client-side data synchronization (minimal use)

**Performance:**

- Image optimization - Next.js Image component, WebP/AVIF
- Code splitting - Route-based, component-based
- Streaming SSR - Progressive page rendering
- Edge caching - Vercel Edge Network, CDN

**SEO:**

- Dynamic metadata - Per-page, per-bookshop
- Structured data - Schema.org LocalBusiness, BreadcrumbList
- Sitemap generation - Dynamic, comprehensive
- Canonical URLs - Proper canonicalization

## Database Schema Considerations

### Column Naming & Data Types

**Legacy vs. Preferred Columns:**

- **Hours:** Prefer `hours_json` (jsonb) over `hours (JSON)` (text)
- **Features:** Prefer `feature_ids` (text[]) over `featureIds (comma-seperated)` (text)
- **Coordinates:** Prefer `lat_numeric`/`lng_numeric` (double precision) over `latitude`/`longitude` (text)
- **Image URL:** Use `imageUrl` (camelCase) - note this differs from snake_case convention

**Special Handling Required:**

- **`google_rating`:** Stored as TEXT (not numeric) - must parse with `parseFloat()` when needed
- **`google_photos`/`google_reviews`:** Stored as jsonb - handle defensive parsing (may be string or object)
- **`feature_ids`:** Stored as text[] array - use PostgreSQL array operators (`@>`, `&&`) for filtering
- **`location`:** PostGIS geography column - use PostGIS functions for spatial queries

### Index Strategy

**Available Indexes (Leverage These):**

1. **GIN index on `feature_ids` (text[]):** Use `.contains('feature_ids', [slug])` for feature filtering
2. **B-tree indexes:** `state`, `city`, `county` - use for filtering
3. **Composite index `(live, state, city)`:**

   - Perfect for filtered list queries
   - Always filter `live = true` first to use partial index

4. **GIST index on `location` (geography):**

   - Use PostGIS functions (`ST_DWithin`, `ST_MakeEnvelope`) for spatial queries
   - More efficient than calculating distance in application code

5. **B-tree index on `slug`:** Use for slug lookups (unique constraint ensures fast lookups)
6. **Full-text search index:** Use `to_tsvector` for search queries

### Query Optimization Patterns

**Pattern 1: Filtered List Queries**

```typescript
// Use composite index (live, state, city)
const { data } = await supabase
  .from('bookstores')
  .select(LIST_COLUMNS)
  .eq('live', true) // Uses partial index
  .eq('state', state) // Uses composite index
  .eq('city', city) // Uses composite index
  .order('name');
```

**Pattern 2: Feature Filtering**

```typescript
// Use GIN index on feature_ids array
const { data } = await supabase
  .from('bookstores')
  .select(LIST_COLUMNS)
  .eq('live', true)
  .contains('feature_ids', [featureSlug]); // Uses GIN index
```

**Pattern 3: Spatial Queries (Nearby Bookstores)**

```typescript
// Use PostGIS location column with GIST index
// Option 1: Use RPC function (recommended)
const { data } = await supabase.rpc('find_nearby_bookstores', {
  center_lat: lat,
  center_lng: lng,
  radius_miles: 10
});

// Option 2: Use PostGIS directly (if RPC not available)
const { data } = await supabase
  .from('bookstores')
  .select(LIST_COLUMNS)
  .eq('live', true)
  .rpc('bookstores_within_radius', {
    center: `POINT(${lng} ${lat})`,
    radius: 16093.4 // meters (10 miles)
  });
```

**Pattern 4: Column Selection**

```typescript
// LIST_COLUMNS: Minimal columns for list views
const LIST_COLUMNS = 'id,name,slug,city,state,county,lat_numeric,lng_numeric,imageUrl,google_rating,feature_ids';

// DETAIL_COLUMNS: All detail fields except photos/reviews
const DETAIL_COLUMNS = 'id,name,slug,city,state,county,street,zip,description,website,phone,hours_json,lat_numeric,lng_numeric,google_rating,google_review_count,feature_ids,imageUrl';

// FULL_DETAIL: Includes photos and reviews (largest payload)
const FULL_DETAIL = `${DETAIL_COLUMNS},google_photos,google_reviews`;
```

### Data Mapping Function

**Critical:** The `mapBookstoreData()` function must handle:

1. Column name inconsistencies (`imageUrl` camelCase)
2. Data type conversions (`lat_numeric` → `latitude` string)
3. JSON parsing (`google_photos`, `google_reviews` jsonb)
4. Array handling (`feature_ids` text[])
5. TEXT to number parsing (`google_rating`)
6. Legacy column fallbacks (`hours (JSON)` → `hours_json`)

## Implementation Plan

### Phase 1: Foundation & Data Layer

**1.1 Database Optimization (Schema-Aware)**

**Schema Considerations:**

- Use `lat_numeric`/`lng_numeric` (double precision) instead of `latitude`/`longitude` (text) for calculations
- Use `hours_json` (jsonb) instead of `hours (JSON)` (text) for hours data
- Use `feature_ids` (text[]) instead of `featureIds (comma-seperated)` (text) for feature filtering
- Use `imageUrl` (camelCase) - note this is different from snake_case convention
- Parse `google_rating` as TEXT (not numeric) - use `parseFloat()` when needed
- Leverage PostGIS `location` (geography) column for spatial queries

**Index Strategy (Already Exists - Leverage These):**

- GIN index on `feature_ids` (text[]) - use `@>` operator for array containment: `feature_ids @> ARRAY['feature-slug']`
- B-tree indexes on `state`, `city`, `county` - use for filtering
- Composite index `(live, state, city)` - perfect for filtered list queries
- GIST index on `location` (geography) - use PostGIS functions for distance queries
- Full-text search index on name, city, state - use `to_tsvector` for search
- B-tree index on `slug` - use for slug lookups

**Query Optimization:**

- Always filter by `live = true` first (uses partial index)
- Use composite index `(live, state, city)` for state/city filtering
- Use GIN array operator `@>` for feature filtering: `.contains('feature_ids', ['feature-slug'])`
- Use PostGIS `ST_DWithin` for nearby bookstores: `location && ST_MakeEnvelope(...)`
- Select only needed columns (LIST_COLUMNS vs DETAIL_COLUMNS vs FULL_DETAIL)
- Use `lat_numeric`/`lng_numeric` for distance calculations, not text columns

**1.2 Data Fetching Architecture (Recommended pattern + schema-aware)**

- Create `lib/bookstore-data.ts` following the recommended pattern:
  - `getAllBookstoreData()` - Fetches all bookstores with optimized column selection
    - Use `LIST_COLUMNS` for list views (minimal columns)
    - Use `DETAIL_COLUMNS` for detail pages
    - Use `FULL_DETAIL` only when photos/reviews needed
  - `mapBookstoreData()` - Maps database columns to application types:
    - Convert `lat_numeric`/`lng_numeric` to `latitude`/`longitude` strings
    - Parse `google_rating` from TEXT to number: `parseFloat(item.google_rating)`
    - Handle `google_photos`/`google_reviews` jsonb parsing (defensive)
    - Prefer `hours_json` (jsonb) over `hours (JSON)` (text)
    - Convert `feature_ids` (text[]) to application array
    - Handle `imageUrl` camelCase column name
  - `processBookstoreData()` - Processes data into efficient lookup Maps:
    - `byCity` - Map<string, Bookstore[]> (key: city.toLowerCase())
    - `byState` - Map<string, Bookstore[]> (key: state.toLowerCase())
    - `byCounty` - Map<string, Bookstore[]> (key: county.toLowerCase())
    - `byFeature` - Map<string, Bookstore[]> (key: feature slug, uses `feature_ids` array)
    - Arrays: `cities`, `states`, `counties`, `features` (unique, sorted)
  - `getProcessedBookstoreData()` - Main cached function that powers all pages
  - Helper functions: `getBookstoresByCity()`, `getBookstoresByState()`, `getBookstoresByCounty()`, `getBookstoresByFeature()`
- All helper functions use `unstable_cache()` and reference shared `getProcessedBookstoreData()`
- Add `safeMapGet()` utility to handle Map serialization edge cases
- Add `ensureMapsAreMaps()` to handle cache serialization issues
- Implement proper error boundaries with graceful fallbacks

**Schema-Specific Mapping:**

```typescript
function mapBookstoreData(item: any): Bookstore {
  return {
    ...item,
    // Use numeric columns for calculations, convert to string for display
    latitude: item.lat_numeric?.toString() || item.latitude || null,
    longitude: item.lng_numeric?.toString() || item.longitude || null,
    // Use array column (preferred over comma-separated text)
    featureIds: item.feature_ids || [],
    // Handle camelCase column name
    imageUrl: item.imageUrl || null,
    // Parse google_rating from TEXT to number
    googleRating: item.google_rating ? parseFloat(item.google_rating) : null,
    // Handle jsonb columns (defensive parsing)
    googlePhotos: parseJsonb(item.google_photos),
    googleReviews: parseJsonb(item.google_reviews),
    // Prefer jsonb hours over text
    hours: item.hours_json || (item['hours (JSON)'] ? JSON.parse(item['hours (JSON)']) : null),
  };
}
```

**1.3 Caching Strategy (Recommended pattern)**

- Use `unstable_cache()` instead of `React cache()` for build-time caching
- Single cache key (`['processed-bookstore-data']`) shared across all pages
- Consistent revalidation: 3600 seconds (1 hour) for all data functions
- Cache tags: `['bookstore-data']` for on-demand revalidation
- Edge caching for static content via Vercel
- Client-side React Query ONLY for interactive features (filtering, search), not initial data load

### Phase 2: Page Architecture

**2.1 Homepage (`app/page.tsx`)**

- Server Component with async data fetching
- Pre-compute featured/popular bookshops server-side
- Memoize state processing (move outside component)
- Optimize "Browse by State" - single pass algorithm
- Implement proper image optimization
- Add structured data (WebSite, Organization)

**2.2 Directory Page (`app/directory/page.tsx`)**

- Server Component with filtered data fetching using `getProcessedBookstoreData()`
- Leverage composite index `(live, state, city)` for efficient filtering
- Use GIN array operator for feature filtering
- Use PostGIS for location-based filtering (if needed)
- Pass initial filtered data to client component
- Implement URL-based filtering (searchParams)
- Optimize map rendering (lazy load, clustering)
- Add pagination for large result sets (use `range()` with composite index)
- Implement proper loading states
- **Ad Integration:**
  - Top banner ad (728x90 or responsive) above filters
  - Sticky sidebar ad (300x600) on desktop only
  - In-feed ads every 10-15 listings (300x250) - lazy loaded
  - Bottom banner (728x90 or responsive)
  - Reserve space for ads to prevent CLS
  - Mobile: 320x50 banner at top, 300x250 after every 8 listings

**2.3 Bookshop Detail (`app/bookshop/[slug]/page.tsx`)**

- Dynamic route with `generateStaticParams` using `getProcessedBookstoreData()`
- ISR with 1-hour revalidation (matches data cache)
- Server-side data fetching using `DETAIL_COLUMNS` or `FULL_DETAIL`
- Parse `google_rating` from TEXT: `parseFloat(bookstore.google_rating)`
- Use `lat_numeric`/`lng_numeric` for distance calculations
- Use PostGIS `location` column for nearby bookstores query
- **Templated About Section (Recommended pattern):**
  - Create `lib/bookstore-content-utils.ts` with `generateAboutBookstoreContent()` function
  - Generate templated content in multiple parts: Location, Type & Specialization, Ratings, Review Themes
  - Return single string for template component
  - Use stored `review_themes` from database (if available) for theme-based content
- Comprehensive structured data (LocalBusiness schema)
- Optimize image loading (priority for hero, lazy for gallery)
- Related bookshops via server-side query using processed data Maps
- Pass `aboutContent` to template component (as in the recommended pattern)
- **Ad Integration:**
  - Top leaderboard (728x90) below breadcrumbs
  - Right rail sticky ad (300x600 or 300x250) desktop only
  - Mid-content ad (300x250) between "About" and "Hours" sections
  - Bottom banner (728x90) after related bookshops
  - Mobile: 320x50 top, 300x250 mid-content, 320x50 bottom
  - Use lazy loading for all below-fold ads
  - Reserve space for ads to prevent CLS

**2.4 State/City/County Pages**

- Dynamic routes with proper metadata using `generateStaticParams()` from processed data
- Server-side filtering using processed Maps
- Leverage composite index `(live, state, city)` for efficient queries
- SEO-optimized URLs with proper slug handling
- Comprehensive structured data (LocalBusiness collection, BreadcrumbList)
- Filter out empty pages (only generate pages with bookstores)
- **Ad Integration:**
  - Top banner (728x90 or responsive)
  - Sidebar (300x250) - if sidebar exists
  - Between listings (300x250 every 10 listings) - lazy loaded
  - Reserve space for ads to prevent CLS

### Phase 3: Component Architecture

**3.1 Component Organization**

```
components/
├── ui/              # shadcn/ui components
├── layout/          # Header, Footer, Navigation
├── bookshop/        # Bookshop-specific components
├── directory/       # Directory-specific components
├── forms/           # Submission forms
└── shared/          # Shared utilities
```

**3.2 Component Patterns**

- Server Components by default
- Client Components only when needed ('use client')
- Proper prop typing with TypeScript
- Memoization for expensive computations
- Error boundaries for resilience

**3.3 Performance Optimizations**

- Lazy load heavy components (maps, images)
- Code split route-based
- Optimize re-renders (useMemo, useCallback)
- Virtual scrolling for long lists
- Image optimization (Next.js Image, proper sizes)

**3.4 About Section Content Generation**

- Create `lib/bookstore-content-utils.ts` following the recommended pattern
- Generate content server-side during page rendering
- Use stored `review_themes` from database (if available)
- Fallback to existing description if themes unavailable
- Pass generated `aboutContent` string to template component

### Phase 4: SEO Implementation

**4.1 Metadata Strategy**

- Dynamic metadata per route
- Proper OpenGraph tags
- Twitter Card support
- Canonical URLs
- Robots meta tags

**4.2 Structured Data**

- LocalBusiness schema for bookshops
- BreadcrumbList for navigation
- WebSite schema for homepage
- Organization schema
- Review/Rating schemas

**4.3 Sitemap & Robots (Recommended pattern)**

- Comprehensive `sitemap.ts` using `getProcessedBookstoreData()` (shared cache)
- Generate URLs for all entity types (bookshops, states, cities, counties, features)
- Filter out empty pages (only include cities/states with bookshops)
- Proper robots.txt with disallow rules for admin/test pages
- Dynamic priority based on page type
- Use `lastModified` from database `updated_at` field

### Phase 5: Performance Optimization

**5.1 Core Web Vitals**

- LCP < 2.5s - Optimize images, reduce render-blocking, account for ad load time (ads add 500ms-1s)
- FID < 100ms - Minimize JavaScript, code splitting
- CLS < 0.1 - Proper image dimensions, font loading, **reserve space for ALL ads** (critical)
- TBT < 200ms - Async AdSense script, lazy load below-fold ads
- **Ad-specific targets:** Ad load time < 500ms, max 3-4 ads above fold, lazy load below-fold, reserve exact space for ads

**5.2 Loading Strategy**

- Streaming SSR for faster TTFB
- Progressive enhancement
- Skeleton screens for loading states
- Optimistic UI updates

**5.3 Bundle Optimization**

- Code splitting by route
- Tree shaking unused code
- Optimize dependencies
- Analyze bundle size

### Phase 6: Modern UX Patterns

**6.1 Navigation**

- Smooth transitions
- Proper loading states
- Error handling with retry
- Accessible keyboard navigation

**6.2 Search & Filtering**

- Server-side filtering
- URL-based state management
- Debounced search
- Filter persistence

**6.3 Map Integration**

- Lazy load Mapbox (critical - Mapbox + AdSense both load heavy JavaScript)
- **Map + Ads Conflict:** Lazy load map (user clicks "Show Map" button) OR load map without ads on directory page; Priority: Ads > Map
- Efficient clustering using `lat_numeric`/`lng_numeric` for calculations
- Use PostGIS `location` column for spatial queries if needed
- Use GIST index on `location` for spatial queries

## Key Patterns to Adopt

### 1. Data Processing Layer (`lib/bookstore-data.ts`)

Single processing function that creates efficient lookup structures (byCity, byState, byCounty, byFeature). Uses `feature_ids` (text[]) array from database for feature grouping. O(1) lookups instead of O(n) filtering; data processed once per build.

### 2. Cache Serialization Handling

`ensureMapsAreMaps()` - Next.js cache may serialize Maps to objects; handle both cases.

### 3. SEO Content Generation Utilities

Shared utilities in `lib/seo-utils.ts`: `generateBookstoreTitle()`, `generateEnhancedBookstoreDescription()` - consistent SEO metadata across all pages.

### 4. Template Components

Reusable page templates (e.g. `SimpleBookstorePageTemplate`) for consistent structure, type-safe props, templated about sections.

### 5. Templated About Section Content Generation

`lib/bookstore-content-utils.ts` with `generateAboutBookstoreContent()` - Location, Type & Specialization, Ratings, Review Themes (or description fallback).

### 6. Comprehensive Sitemap Generation

Generate sitemap from shared `getProcessedBookstoreData()`; filter empty pages; use shared cache.

## Migration Strategy

### Step 1: Setup New Structure

New Next.js 15 project, TypeScript strict, Tailwind, shadcn/ui, Supabase client.

### Step 2: Migrate Data Layer

Unified data access layer (`lib/bookstore-data.ts`), `mapBookstoreData()` schema-aware, optimized queries, PostGIS RPCs if needed, error handling, `unstable_cache()`.

### Step 3: Build Pages

Homepage, Directory, Bookshop detail (with `generateAboutBookstoreContent()` and template), State/City/County pages.

### Step 4: Add Components

Layout, bookshop (including `SimpleBookstorePageTemplate`), directory, forms, **Ad Components (AdSense)** - AdSenseSlot, LazyAdSenseSlot, AdContainer, ResponsiveAdSenseSlot, StickyAdSidebar, TrackedAdSenseSlot; AdSense script in layout; `public/ads.txt`. Content generation utilities.

### Step 5: SEO Implementation

Dynamic metadata, structured data, sitemap, robots.txt, AdSense integration (async script, slots, reserve space, lazy below-fold).

### Step 6: Performance Optimization

Image optimization, code splitting, bundle analysis, Core Web Vitals.

### Step 7: Testing & Deployment

Comprehensive testing, performance testing, SEO verification, staged deployment.

## Success Metrics

- **Performance:** Lighthouse 90+, LCP < 2.5s, FID < 100ms, CLS < 0.1, TBT < 200ms
- **SEO:** 100% href coverage, all pages indexed, rich snippets, validated structured data
- **Cost:** Supabase egress < $10/month, minimal Vercel
- **UX:** Fast loads, smooth interactions, WCAG 2.1 AA, mobile-optimized

## Additional Considerations

### Error Handling & Resilience

Error boundaries (`app/error.tsx`, `app/not-found.tsx`), graceful fallbacks for missing data, Supabase/retry handling.

### API Routes Strategy

Minimal API routes: client-side filtering, form submissions, `/api/revalidate`, OG image. Use Server Components for initial data. Required: `/api/bookstores`, events, features, place-photo, config, revalidate, contact, bookshop-submission, event-submission.

### Events & Features Integration

Events server-side on detail pages; features in templated about content and filtering; `feature_ids` for related suggestions.

### Form Submissions

Bookshop and event submission via API routes; validation, email, DB insert, success/error feedback.

### URL Redirects & Migration

Middleware for old→new routes, 301s, case-insensitive slugs; test all redirects.

### Search Functionality

Full-text search index, PostgreSQL `to_tsvector`, server-side search with debouncing.

### Image Optimization

`/api/place-photo` proxy; Next.js Image, lazy gallery, priority hero; fallbacks and alt text.

### Accessibility (WCAG 2.1 AA)

Semantic HTML, heading hierarchy, ARIA, keyboard nav, focus, contrast, screen reader, skip links.

### Testing Strategy

Unit tests (data/seo utils), integration (data fetching), E2E (critical flows), Lighthouse CI, SEO and a11y testing.

### Monitoring & Analytics

Vercel Analytics, Core Web Vitals (with ads), ad load/viewability, CLS/LCP with vs without ads, Sentry, DB/cache monitoring. SEO: Search Console, sitemap, structured data. **Ad revenue:** AdSense reports, RPM by page type, viewability, page speed vs RPM, bounce vs ad density.

### Review Themes Migration (Future)

Add `review_themes` jsonb; migration script; update `generateAboutBookstoreContent()`; fallback if missing.

## AdSense Integration & Revenue Optimization

### Current AdSense Setup

- Publisher ID: `ca-pub-4357894821158922`
- Manual ad placement (not Auto Ads)
- Existing: `AdSense.tsx`, `AdSenseHead.tsx` in client; `client/public/ads.txt`

### Ad Placement Architecture

- **Homepage:** Hero banner (728x90), sidebar (300x250), mid-content (300x250)
- **Directory:** Top banner, sticky sidebar (300x600 desktop), in-feed every 10-15, bottom banner; mobile: 320x50 top, 300x250 every 8
- **Bookshop Detail:** Top (728x90), right rail sticky (300x600/300x250), mid-content (300x250), bottom (728x90); mobile: 320x50 top, 300x250 mid, 320x50 bottom
- **State/City/County:** Top banner, sidebar (300x250), between listings every 10

### Components

- **AdSenseSlot.tsx** - Next.js App Router, CLS minHeight/minWidth
- **LazyAdSenseSlot.tsx** - Intersection Observer, load 200px before visible
- **AdContainer.tsx** - Reserve space to prevent CLS
- **ResponsiveAdSenseSlot.tsx** - Mobile vs desktop slots
- **StickyAdSidebar.tsx** - Desktop only, 300x600
- **TrackedAdSenseSlot.tsx** - Viewability tracking (e.g. gtag)

### Loading Strategy

- Async AdSense script in `app/layout.tsx` (do not block render)
- Lazy load all below-fold ads
- Reserve exact space for every ad

### Migration

- Move `AdSense.tsx` → `components/ads/AdSenseSlot.tsx`
- `AdSenseHead.tsx` → layout head
- `client/public/ads.txt` → `public/ads.txt`

## Outstanding Issues from Current Project

### SEO (Ahrefs)

- **3XX Redirect Chains:** Configure Vercel/DNS for single-hop redirect to final URL
- **CSS File Size (23.4 KB):** Code splitting, purge, critical CSS in Next.js 15
- **Duplicate Pages Without Canonical:** Unique Server Component content per page, canonicals
- **H1 Missing/Empty:** Audit all pages for visible H1
- **Twitter Card Missing:** Add Twitter card metadata
- **Indexable Pages Not in Sitemap:** Comprehensive sitemap (in plan)

### Rate Limiting

- Add rate limiting to `/api/bookshop-submission` and `/api/event-submission` (Vercel Edge or API middleware)

### Code Quality

- Shared utilities / API: Prefer migrating API to TypeScript (Next.js)
- Unit tests for shared utils: Include in testing strategy

### Directory Page

- **URL params:** Add searchParams for state, city, county, features
- **Empty state:** Overlay and messages when no results; clear filters / zoom out

## Notes

- **Database Schema:** Prefer `hours_json`, `feature_ids`, `lat_numeric`/`lng_numeric`; parse `google_rating`; use `imageUrl` (camelCase).
- **Indexes:** Leverage existing GIN, B-tree, composite, GIST.
- **PostGIS:** Add RPCs for spatial queries if missing.
- **Column Mapping:** Centralize in `mapBookstoreData()`.
- **URLs:** Backward compatibility and redirects.
- **Supabase / Design / Functionality:** Preserve existing; optimize architecture.
- **Events / Forms / Search:** Keep and integrate as described.
