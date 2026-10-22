import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicit workspace root so Turbopack doesn't infer wrong root when multiple lockfiles exist
  turbopack: {
    root: __dirname,
  },
  // Use Next.js-specific tsconfig to avoid conflicts with Vite app
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

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
      {
        source: '/directory/state/:state',
        destination: '/directory?state=:state',
        permanent: true,
      },
      {
        source: '/directory/city/:state/:city',
        destination: '/directory?state=:state&city=:city',
        permanent: true,
      },
      {
        source: '/directory/county/:state/:county',
        destination: '/directory?state=:state&county=:county',
        permanent: true,
      },
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
