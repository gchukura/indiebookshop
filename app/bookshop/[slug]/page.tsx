import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookstoreBySlug, getBookstoreById, getPopularBookstores } from '@/lib/queries/bookstores';
import { generateSlugFromName } from '@/shared/utils';
import BookshopDetailClient from './BookshopDetailClient';

type Props = {
  params: { slug: string };
};

/**
 * Pre-generate top 100 bookshops at build time for ISR
 */
export async function generateStaticParams() {
  try {
    const bookstores = await getPopularBookstores(100);

    return bookstores.map((bookstore) => ({
      slug: generateSlugFromName(bookstore.name),
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Allow on-demand generation for other bookshops
export const dynamicParams = true;

/**
 * Generate dynamic metadata for each bookshop
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const bookstore = await getBookstoreBySlug(params.slug);

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
    const hasRating = bookstore.googleRating && bookstore.googleReviewCount;
    const ratingText = hasRating ? ` Rated ${bookstore.googleRating} stars by ${bookstore.googleReviewCount.toLocaleString()} customers.` : '';
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
        url: `https://www.indiebookshop.com/bookshop/${params.slug}`,
      },
      alternates: {
        canonical: `https://www.indiebookshop.com/bookshop/${params.slug}`,
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
    // Check if slug is numeric ID
    const isNumericId = /^\d+$/.test(params.slug);
    const bookstore = isNumericId ? await getBookstoreById(parseInt(params.slug)) : await getBookstoreBySlug(params.slug);

    if (!bookstore) {
      notFound();
    }

    // If numeric ID was used, redirect to canonical slug-based URL
    const canonicalSlug = generateSlugFromName(bookstore.name);
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

// Revalidate every 30 minutes (matches Phase 1 cache TTL)
export const revalidate = 1800;
