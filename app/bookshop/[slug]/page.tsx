import { Metadata } from 'next';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { getBookstoreBySlugFull, getBookstoreById, getAllBookstores, getNearbyBookstores, getUpcomingEvents } from '@/lib/data/bookstore-data';
import { getBookstoreSlug } from '@/lib/data/slug';
import { getBookstoreDescription } from '@/lib/data/bookstore-content';
import ShopDetail from '@/components/bookshop/ShopDetail';
import { getMapboxToken } from '@/lib/mapbox';
import { BRAND, fitTitle } from '@/lib/seo';
import { getStateAbbrev } from '@/lib/state-utils';
import { getFeatureIndex } from '@/lib/data/features';

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Pre-generate ALL bookshops at build time (optimized for cost reduction)
 * This eliminates runtime queries and reduces Supabase egress dramatically
 */
export async function generateStaticParams() {
  try {
    const bookstores = await getAllBookstores();

    return bookstores
      .filter((bookstore) => bookstore && bookstore.name) // Filter out invalid entries
      .map((bookstore) => ({
        // Use slug from database (more efficient than generating)
        slug: getBookstoreSlug(bookstore),
      }))
      .filter((param) => param.slug); // Filter out empty slugs
  } catch (error) {
    console.error('Error generating static params:', error);
    // Return empty array to allow dynamic generation
    return [];
  }
}

// Enable on-demand generation for new bookshops
// This allows pages to be generated at request time if not in static params
export const dynamicParams = true;

/**
 * Generate dynamic metadata for each bookshop
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    
    // Validate slug exists
    if (!resolvedParams?.slug) {
      return {
        title: 'Bookshop Not Found',
      };
    }
    
    // Decode the slug in case it's URL-encoded
    const decodedSlug = decodeURIComponent(resolvedParams.slug);
    const bookstore = await getBookstoreBySlugFull(decodedSlug);

    if (!bookstore) {
      return {
        title: 'Bookshop Not Found',
      };
    }

    let description = getBookstoreDescription(bookstore).text;

    // Add rating if available
    const hasRating = bookstore.googleRating && bookstore.googleReviewCount !== null && bookstore.googleReviewCount !== undefined;
    const ratingText = hasRating && bookstore.googleReviewCount ? ` Rated ${bookstore.googleRating} stars by ${bookstore.googleReviewCount.toLocaleString()} customers.` : '';
    const ratingAlreadyIncluded = description.toLowerCase().includes('rating') || description.toLowerCase().includes('star') || description.toLowerCase().includes('review');

    if (hasRating && !ratingAlreadyIncluded) {
      description = `${description}${ratingText}`;
    }

    // Truncate to 320 chars
    if (description.length > 320) {
      const truncated = description.substring(0, 317);
      const lastSpace = truncated.lastIndexOf(' ');
      description = lastSpace > 280 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }

    // Share images come from ./opengraph-image.tsx (file convention)

    return {
      title: {
        absolute: fitTitle([
          `${bookstore.name} | Bookshop in ${bookstore.city}, ${getStateAbbrev(bookstore.state)} | ${BRAND}`,
          `${bookstore.name}, ${bookstore.city}, ${getStateAbbrev(bookstore.state)} | ${BRAND}`,
          `${bookstore.name} | ${BRAND}`,
          bookstore.name,
        ]),
      },
      description,
      openGraph: {
        title: `${bookstore.name} - Indie Bookshop`,
        description: description.slice(0, 160),
        type: 'website',
        url: `https://www.indiebookshop.com/bookshop/${decodedSlug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${bookstore.name} - Indie Bookshop`,
        description: description.slice(0, 160),
      },
      alternates: {
        canonical: `https://www.indiebookshop.com/bookshop/${decodedSlug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Bookshop Details',
    };
  }
}

/** Finds the shop (redirecting non-canonical slugs) and loads everything the page shows. */
async function loadBookshopPage(params: Props['params']) {
  try {
    const resolvedParams = await params;
    
    // Validate slug exists
    if (!resolvedParams?.slug) {
      console.error('[BookshopPage] No slug provided in params:', resolvedParams);
      notFound();
    }
    
    // Decode the slug in case it's URL-encoded
    const decodedSlug = decodeURIComponent(resolvedParams.slug);
    
    // Validate decoded slug
    if (!decodedSlug || decodedSlug === 'undefined') {
      console.error('[BookshopPage] Invalid slug after decoding:', resolvedParams.slug);
      notFound();
    }
    
    // Check if slug is numeric ID
    const isNumericId = /^\d+$/.test(decodedSlug);
    let bookstore = isNumericId 
      ? await getBookstoreById(parseInt(decodedSlug)) 
      : await getBookstoreBySlugFull(decodedSlug);

    // If not found by slug and it's not numeric, try as ID anyway (some old links might use IDs)
    if (!bookstore && !isNumericId && /^\d+/.test(decodedSlug)) {
      const numericPart = decodedSlug.match(/^\d+/)?.[0];
      if (numericPart) {
        bookstore = await getBookstoreById(parseInt(numericPart));
      }
    }

    if (!bookstore) {
      // Log for debugging
      console.error(`[BookshopPage] Bookshop not found for slug: ${decodedSlug}`, {
        isNumericId,
        slug: decodedSlug,
        env: process.env.NODE_ENV,
      });
      
      // Return 404 - dynamicParams will allow on-demand generation if needed
      notFound();
    }

    // Numeric IDs, ID-prefixed slugs and case variants all 308 to the canonical lowercase slug
    const canonicalSlug = getBookstoreSlug(bookstore).toLowerCase();
    if (canonicalSlug && decodedSlug !== canonicalSlug) {
      permanentRedirect(`/bookshop/${canonicalSlug}`);
    }

    const [nearby, events, featureLinks] = await Promise.all([
      getNearbyBookstores(bookstore, 6),
      // Events and chips are optional; a failed read shouldn't fail the page
      getUpcomingEvents(bookstore.id).catch(() => []),
      getFeatureIndex().then(f => f.links).catch(() => ({})),
    ]);

    return { bookstore, canonicalSlug, nearby, events, featureLinks };
  } catch (error) {
    // Let Next's redirect/notFound signals through instead of turning them into a 404
    unstable_rethrow(error);
    console.error('Error loading bookshop:', error);
    notFound();
  }
}

/**
 * Bookshop Detail Page - Server Component with ISR
 */
export default async function BookshopPage({ params }: Props) {
  // JSX is built outside the try/catch so render errors reach the error boundary
  const props = await loadBookshopPage(params);
  return <ShopDetail {...props} mapboxToken={getMapboxToken()} />;
}

// Revalidate every 24 hours (bookstore data rarely changes)
// This reduces query frequency from 48x per day to 1x per day
export const revalidate = 86400;
