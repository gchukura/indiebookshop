import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

// Configure viewport with proper accessibility settings
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow users to zoom up to 5x for accessibility
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.indiebookshop.com'),
  title: {
    default: 'IndiebookShop.com - Discover Independent Bookshops Across America',
    template: '%s | IndiebookShop.com',
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
    images: [
      {
        url: 'https://www.indiebookshop.com/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'IndiebookShop.com - Discover Independent Bookstores Across America',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndiebookShop.com - Discover Independent Bookshops',
    description: 'Find and support over 3,000 independent bookstores across America.',
    images: ['https://www.indiebookshop.com/og-default.jpg'],
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense Script - Loaded async to not block rendering */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4357894821158922"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
