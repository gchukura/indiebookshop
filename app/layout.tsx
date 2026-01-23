import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
