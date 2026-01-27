import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookstoreBySlug, getBookstoreById, getAllBookstores } from '@/lib/queries/bookstores';
import { generateSlugFromName } from '@/shared/utils';
import BookshopDetailClient from './BookshopDetailClient';

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
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
        slug: bookstore.slug || generateSlugFromName(bookstore.name),
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
    // Handle params - in Next.js 15+, params might be a Promise
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Validate slug exists
    if (!resolvedParams?.slug) {
      return {
        title: 'Bookshop Not Found | IndiebookShop.com',
      };
    }
    
    // Decode the slug in case it's URL-encoded
    const decodedSlug = decodeURIComponent(resolvedParams.slug);
    const bookstore = await getBookstoreBySlug(decodedSlug);

    if (!bookstore) {
      return {
        title: 'Bookshop Not Found | IndiebookShop.com',
      };
    }

    // Priority-based description:
    // 1. Google description (if >= 100 chars)
    // 2. AI-generated description (if validated)
    // 3. Original description
    // 4. Fallback template
    let description = '';

    if (bookstore.googleDescription && bookstore.googleDescription.length >= 100) {
      description = bookstore.googleDescription;
    } else if (bookstore.aiGeneratedDescription && bookstore.descriptionValidated === true) {
      description = bookstore.aiGeneratedDescription;
    } else if (bookstore.description && bookstore.description.trim().length > 0) {
      description = bookstore.description;
    } else {
      const location = bookstore.city && bookstore.state ? `${bookstore.city}, ${bookstore.state}` : bookstore.city || bookstore.state || 'America';
      description = `${bookstore.name} is an independent bookstore in ${location}. Discover this local indie bookshop, browse their curated selection, and support independent bookselling in your community.`;
    }

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

    return {
      title: `${bookstore.name} | Independent Bookshop in ${bookstore.city}, ${bookstore.state}`,
      description,
      openGraph: {
        title: `${bookstore.name} - Indie Bookshop`,
        description: description.slice(0, 160),
        images: bookstore.imageUrl ? [{ url: bookstore.imageUrl }] : [],
        type: 'website',
        url: `https://www.indiebookshop.com/bookshop/${decodedSlug}`,
      },
      alternates: {
        canonical: `https://www.indiebookshop.com/bookshop/${decodedSlug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Bookshop Details | IndiebookShop.com',
    };
  }
}

/**
 * Bookshop Detail Page - Server Component with ISR
 */
export default async function BookshopPage({ params }: Props) {
  try {
    // Handle params - in Next.js 15+, params might be a Promise
    const resolvedParams = params instanceof Promise ? await params : params;
    
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
      : await getBookstoreBySlug(decodedSlug);

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

    // If numeric ID was used, redirect to canonical slug-based URL
    // Use slug from database if available, otherwise generate
    const canonicalSlug = bookstore.slug || generateSlugFromName(bookstore.name);
    if (isNumericId && canonicalSlug) {
      // Next.js will handle the redirect via middleware or we can use next/navigation redirect
      // For now, we'll pass the canonical slug to the client for potential redirect
    }

    return <BookshopDetailClient bookstore={bookstore} canonicalSlug={canonicalSlug} />;
  } catch (error) {
    console.error('Error loading bookshop:', error);
    notFound();
  }
}

// Revalidate every 24 hours (bookstore data rarely changes)
// This reduces query frequency from 48x per day to 1x per day
export const revalidate = 86400;
