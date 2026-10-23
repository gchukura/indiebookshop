import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicit workspace root so Turbopack doesn't infer the wrong root when another lockfile exists higher up
  turbopack: {
    root: __dirname,
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Bundle next-mdx-remote so its JSX uses Next's React, not the copy in
  // node_modules (otherwise blog posts fail with "React Element from an older version").
  transpilePackages: ['next-mdx-remote'],

  // The Sheet snapshot (scripts/export-sheet.ts) is read with fs at runtime, which
  // file tracing can't see, so ship it with every server function explicitly
  outputFileTracingIncludes: {
    '/**': ['./.data/sheet.json'],
  },

  // Shop photos are stored in Cloudflare R2 and served same-origin at /photos/...
  // so they're cached by Vercel's CDN instead of hitting the rate-limited r2.dev URL.
  async rewrites() {
    const r2 = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    if (!r2) {
      console.warn('[next.config] R2_PUBLIC_URL is not set; /photos/* will 404');
      return [];
    }
    return [{ source: '/photos/:path*', destination: `${r2}/photos/:path*` }];
  },

  // Redirects for legacy URLs (maintaining SEO)
  async redirects() {
    return [
      {
        source: '/bookstore/:id',
        destination: '/bookshop/:id',
        permanent: true,
      },
      {
        source: '/submit-bookshop',
        destination: '/submit',
        permanent: true,
      },
      // /directory/{state,city,county}/... are handled by route handlers in
      // app/directory/{state,city,county}/ — they map raw names like "CA" or
      // "San Francisco" to the /bookshops slugs, which a static rule can't do.
      {
        source: '/directory/category/:featureId',
        destination: '/directory?features=:featureId',
        permanent: true,
      },
    ];
  },

  // Optimize builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Security and caching headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Let Vercel's CDN cache the /photos rewrite to R2 using R2's Cache-Control
        // (projects created before April 2026 don't cache external rewrites by default)
        source: '/photos/:path*',
        headers: [
          {
            key: 'x-vercel-enable-rewrite-caching',
            value: '1',
          },
        ],
      },
      {
        // Placeholder photos (public/placeholders); a week, so swapping one out still propagates
        source: '/placeholders/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800',
          },
        ],
      },
      {
        // Cache fonts
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
