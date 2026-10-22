/**
 * URL slug for a bookshop name: "Powell's Books" → "powells-books".
 * Used when a Sheet row has no `slug`. Safe for client and server code.
 */
export function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Collapse repeated hyphens
    .replace(/^-+|-+$/g, '')  // Trim leading/trailing hyphens
    .trim();
}

/** The shop's slug from the Sheet, else one generated from its name. */
export function getBookstoreSlug(bookstore: { slug?: string | null; name: string }): string {
  return bookstore.slug || generateSlugFromName(bookstore.name);
}
