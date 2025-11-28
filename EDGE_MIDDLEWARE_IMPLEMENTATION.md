# Vercel Edge Middleware Implementation for Meta Tag Injection

## Overview

This implementation adds server-side meta tag injection for `/bookshop/:slug` routes using Vercel Edge Middleware. The middleware intercepts requests, fetches bookshop data from Supabase, generates meta tags, and injects them into the HTML response.

## Implementation Details

### File: `middleware.ts`

Located in the project root, this file contains:
1. **Rate limiting** (existing functionality for `/api/*` routes)
2. **Meta tag injection** (new functionality for `/bookshop/*` routes)

### Key Features

1. **Slug-based bookshop lookup**: Fetches bookshop data from Supabase by matching the URL slug to bookshop names
2. **Meta tag generation**: Creates canonical, Open Graph, and Twitter Card tags
3. **HTML injection**: Injects meta tags into the `<head>` section of the HTML
4. **Error handling**: Gracefully handles missing bookshops, Supabase errors, and HTML fetch failures

### Meta Tags Generated

- `<title>` - Dynamic title with bookshop name and location
- `<meta name="description">` - Bookshop description (with fallback template)
- `<link rel="canonical">` - Canonical URL using slug format
- Open Graph tags (`og:title`, `og:description`, `og:url`, `og:image`, etc.)
- Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, etc.)

### Environment Variables Required

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Edge Runtime Configuration

```typescript
export const config = {
  matcher: [
    '/bookshop/:slug*',
    '/api/:path*',
  ],
  runtime: 'edge',
};
```

## How It Works

1. **Request Interception**: Middleware intercepts requests to `/bookshop/*` routes
2. **Slug Extraction**: Extracts the slug from the URL path
3. **Data Fetching**: Fetches all live bookstores from Supabase and finds the matching one by slug
4. **Meta Tag Generation**: Generates meta tags using the bookshop data
5. **HTML Fetching**: Fetches the original `index.html` from the origin
6. **HTML Injection**: Injects meta tags into the `<head>` section
7. **Response**: Returns the modified HTML with meta tags

## Limitations & Considerations

### Current Implementation

The current implementation fetches HTML from the origin using `fetch()`. This works but has some considerations:

1. **Circular Request Risk**: Fetching from the same origin could create circular requests in some scenarios
2. **Performance**: Fetches all bookstores from Supabase on each request (could be optimized with caching)
3. **Edge Runtime**: Limited to Web API types (no Node.js APIs)

### Optimization Opportunities

1. **Caching**: Cache bookshop data in Edge Middleware (using Vercel's edge cache or Upstash Redis)
2. **Slug Index**: Create a slug-to-ID mapping table in Supabase for faster lookups
3. **HTML Caching**: Cache the base HTML template to avoid fetching on every request

## Testing

### Local Testing

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Run local development server with Edge Middleware
vercel dev
```

Visit `http://localhost:3000/bookshop/113-books` and check "View Page Source" for meta tags.

### Production Testing

After deployment to Vercel:
1. Visit `https://indiebookshop.com/bookshop/113-books`
2. Right-click → "View Page Source"
3. Search for "canonical" or "og:title"
4. Verify meta tags are present in the initial HTML

## Deployment

The middleware is automatically detected by Vercel when deployed. No additional configuration is needed beyond:

1. Setting environment variables in Vercel dashboard
2. Ensuring `middleware.ts` is in the project root
3. Deploying to Vercel

## Troubleshooting

### Meta Tags Not Appearing

1. **Check Environment Variables**: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel
2. **Check Logs**: View Vercel function logs for errors
3. **Verify Slug**: Ensure the bookshop name generates the correct slug
4. **Check Matcher**: Verify the route matches `/bookshop/:slug*`

### Performance Issues

1. **Too Many Bookstores**: The current implementation fetches all bookstores. Consider:
   - Adding a slug column to Supabase for direct lookup
   - Implementing caching
   - Using a serverless function instead of edge middleware

### Edge Runtime Errors

Edge Middleware has limitations:
- No Node.js APIs (use Web APIs instead)
- Limited execution time
- No file system access

If you encounter errors, check that all code is compatible with the Edge Runtime.

## Next Steps

1. **Optimize Data Fetching**: 
   - Add a `slug` column to the `bookstores` table in Supabase
   - Query directly by slug instead of fetching all bookstores

2. **Add Caching**:
   - Cache bookshop data in Edge Middleware
   - Use Vercel's edge cache or Upstash Redis

3. **Monitor Performance**:
   - Track middleware execution time
   - Monitor Supabase query performance
   - Check for any edge runtime errors

