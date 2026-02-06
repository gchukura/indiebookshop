/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Next.js-specific tsconfig to avoid conflicts with Vite app
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
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

  // Environment variables exposed to the browser
  // Note: Vercel should have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set
  // If not set, fall back to SUPABASE_URL and SUPABASE_ANON_KEY
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
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
