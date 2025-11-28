# Vercel Edge Function Implementation for Meta Tag Injection

## Overview

This implementation uses Vercel Edge Functions (not Next.js middleware) to inject server-side meta tags for `/bookshop/:slug` routes. This approach works with Vite + React (non-Next.js) applications.

## File Structure

```
api/
  bookshop/
    [slug].ts    # Edge Function handler
```

## How It Works

1. **Route Rewriting**: `vercel.json` rewrites `/bookshop/:slug` → `/api/bookshop/:slug`
2. **Edge Function**: The `[slug].ts` file handles the request
3. **Data Fetching**: Fetches bookshop data from Supabase REST API
4. **HTML Injection**: Fetches base HTML and injects meta tags
5. **Response**: Returns modified HTML with meta tags

## Configuration

### vercel.json

Added route rewrite:
```json
{
  "src": "/bookshop/(.*)",
  "dest": "/api/bookshop/$1"
}
```

**Important**: This route must be placed BEFORE the catch-all route `/(.*)` that sends everything to `/index.html`.

### Edge Function

- **Location**: `/api/bookshop/[slug].ts`
- **Runtime**: `edge` (specified in `export const config`)
- **Handler**: Default export function that receives `Request` and returns `Response`

## Key Features

1. **Direct Supabase REST API**: Uses `fetch()` instead of `@supabase/supabase-js` for better edge runtime compatibility
2. **Slug Matching**: Generates slugs from bookshop names and matches against URL slug
3. **HTML Injection**: Fetches base HTML and injects meta tags into `<head>`
4. **Error Handling**: Gracefully handles missing bookshops, Supabase errors, and HTML fetch failures
5. **Fallback HTML**: Returns basic HTML with meta tags if base HTML fetch fails

## Meta Tags Generated

- `<title>` - Dynamic title with bookshop name and location
- `<meta name="description">` - Bookshop description (with fallback template)
- `<link rel="canonical">` - Canonical URL using slug format
- Open Graph tags (`og:title`, `og:description`, `og:url`, `og:image`, etc.)
- Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, etc.)

## Environment Variables

Required in Vercel dashboard:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Testing

### Local Testing

```bash
# Install Vercel CLI
npm install vercel --save-dev

# Run local development
npx vercel dev
```

Visit `http://localhost:3000/bookshop/113-books` and check "View Page Source" for meta tags.

### Production Testing

After deployment:
1. Visit `https://indiebookshop.com/bookshop/113-books`
2. Right-click → "View Page Source"
3. Search for "canonical" or "og:title"
4. Verify meta tags are present in the initial HTML

## Performance Considerations

### Current Implementation

- Fetches ALL bookstores from Supabase on each request
- Then filters client-side to find matching slug
- This is inefficient but works

### Optimization Opportunities

1. **Add Slug Column to Supabase**:
   - Add a `slug` column to the `bookstores` table
   - Generate slugs when bookshops are created/updated
   - Query directly: `?slug=eq.113-books`

2. **Caching**:
   - Cache bookshop data in Edge Function (using Vercel's edge cache)
   - Cache the base HTML template
   - Use `Cache-Control` headers appropriately

3. **Index Optimization**:
   - Create an index on the `slug` column in Supabase
   - This will make queries much faster

## Troubleshooting

### Meta Tags Not Appearing

1. **Check Route Order**: Ensure `/bookshop/(.*)` route is BEFORE `/(.*)` in `vercel.json`
2. **Check Environment Variables**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel
3. **Check Function Logs**: View Vercel function logs for errors
4. **Verify Slug**: Ensure the bookshop name generates the correct slug

### Function Not Executing

1. **Check File Location**: Must be in `/api/bookshop/[slug].ts`
2. **Check Route Pattern**: Should match `/bookshop/:slug` in `vercel.json`
3. **Check Build Logs**: Look for "Edge Function" or "Function" in Vercel build output

### Performance Issues

1. **Too Many Bookstores**: Current implementation fetches all bookstores. Consider:
   - Adding a slug column to Supabase
   - Implementing caching
   - Using a serverless function instead of edge function

## Differences from Middleware Approach

| Aspect | Middleware (Next.js) | Edge Function (This) |
|--------|---------------------|----------------------|
| Works with | Next.js only | Any Vercel deployment |
| File location | `middleware.ts` in root | `/api/bookshop/[slug].ts` |
| Configuration | `export const config` | `export const config` + `vercel.json` |
| Route matching | Automatic via matcher | Manual via `vercel.json` routes |
| Request handling | Intercepts all matching routes | Handles specific route pattern |

## Next Steps

1. **Deploy and Test**: Push to Vercel and verify meta tags appear
2. **Monitor Performance**: Check function execution time and errors
3. **Optimize**: Add slug column to Supabase for faster lookups
4. **Add Caching**: Implement edge caching for better performance

