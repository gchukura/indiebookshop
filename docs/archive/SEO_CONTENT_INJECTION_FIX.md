# SEO Content Injection Fix for Production

## Problem

SEO content injection works in development (Express server) but not in production (Vercel) because:

1. **Static pages are served directly** - Vercel's rewrite rule `"source": "/(.*)", "destination": "/index.html"` serves static files directly, bypassing serverless functions
2. **Edge Middleware only handles bookshop pages** - Currently only `/bookshop/*` routes get meta tag injection
3. **Serverless function catch-all sends hardcoded HTML** - The catch-all route in `api/serverless.js` sends a basic HTML template without SEO content

## Solution

Add SEO content injection to **Vercel Edge Middleware** (`middleware.ts`) for static pages. Edge Middleware runs before static files are served, so we can intercept and inject SEO content.

### Implementation Plan

1. Add static SEO content generation functions to Edge Middleware (without dynamic bookshop links)
2. Detect static page routes (homepage, directory, about, contact, events, blog)
3. Fetch the base HTML and inject SEO content before returning
4. Cache the modified HTML for performance

### Trade-offs

- **Pros**: Works in production, runs at the edge (fast), no serverless function overhead
- **Cons**: Can't easily fetch dynamic bookshop data for links (Edge Middleware limitations)
- **Mitigation**: Inject static SEO content (still valuable for SEO), bookshop links can be added client-side

## Files to Modify

- `middleware.ts` - Add static page detection and SEO content injection

## Status

🔴 **Not Implemented** - Needs to be added
