/** @type {import('next').NextConfig} */
const nextConfig = {
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
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
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
};

export default nextConfig;
