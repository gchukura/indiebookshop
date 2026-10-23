import type { Bookstore } from '@/shared/schema';

export type BookstoreDescription = {
  text: string;
  /** Where the text came from; 'template' means no real description exists. */
  source: 'description' | 'google' | 'ai' | 'template';
};

type DescriptionFields = Pick<
  Bookstore,
  'name' | 'city' | 'state' | 'description' | 'googleDescription' | 'aiGeneratedDescription' | 'descriptionValidated'
>;

/**
 * The shop's description, in priority order: the Sheet's `description`, Google's
 * description, a validated AI description, else a generic template sentence.
 */
export function getBookstoreDescription(bookstore: DescriptionFields): BookstoreDescription {
  const own = bookstore.description?.trim();
  if (own) return { text: own, source: 'description' };

  const google = bookstore.googleDescription?.trim();
  if (google) return { text: google, source: 'google' };

  const ai = bookstore.aiGeneratedDescription?.trim();
  if (ai && bookstore.descriptionValidated === true) return { text: ai, source: 'ai' };

  const location =
    bookstore.city && bookstore.state
      ? `${bookstore.city}, ${bookstore.state}`
      : bookstore.city || bookstore.state || 'America';
  return {
    text: `${bookstore.name} is an independent bookstore in ${location}. Discover this local indie bookshop, browse their curated selection, and support independent bookselling in your community.`,
    source: 'template',
  };
}
