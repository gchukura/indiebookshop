import type { Metadata, Viewport } from 'next';
import { Libre_Baskerville, Open_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { hasBlogPosts } from '@/lib/blog';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';
import Script from 'next/script';
import { ADS_ENABLED, ADSENSE_CLIENT } from '@/lib/ads';

// Brand fonts, exposed as CSS variables consumed by tailwind.config.ts fontFamily
const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  // Not preloaded: on phones it competed with the shop page's hero photo (LCP); the
  // size-adjusted fallback keeps the swap from shifting layout
  preload: false,
});

// Configure viewport with proper accessibility settings
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow users to zoom up to 5x for accessibility
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.indiebookshop.com'),
  title: {
    default: 'Independent Bookshops Across America | IndieBookShop',
    template: '%s | IndieBookShop',
  },
  description: 'Find and support over 3,000 independent bookstores across America. Discover unique bookshops, browse by location, and support local businesses.',
  keywords: ['independent bookstores', 'bookshops', 'local bookstores', 'indie bookstores', 'book shops near me'],
  authors: [{ name: 'IndiebookShop.com' }],
  creator: 'IndiebookShop.com',
  publisher: 'IndiebookShop.com',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.indiebookshop.com',
    title: 'IndiebookShop.com - Discover Independent Bookshops',
    description: 'Find and support over 3,000 independent bookstores across America.',
    siteName: 'IndiebookShop.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndiebookShop.com - Discover Independent Bookshops',
    description: 'Find and support over 3,000 independent bookstores across America.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // AdSense site verification; only when ads are on (docs/ADS.md)
  ...(ADS_ENABLED && { other: { 'google-adsense-account': ADSENSE_CLIENT } }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${libreBaskerville.variable} ${openSans.variable}`}>
      <body className="font-sans">
        {ADS_ENABLED && (
          <Script
            id="adsense"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header showBlog={hasBlogPosts()} />
            <main className="flex-grow flex flex-col min-h-0">
              {children}
            </main>
            <Footer showBlog={hasBlogPosts()} />
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
