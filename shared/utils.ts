/**
 * Shared utility functions used across server and client code
 * These functions are kept in sync to ensure consistency
 */

/**
 * Generate a URL-friendly slug from a bookshop name
 * This function must match the client-side implementation exactly
 * 
 * @param name - The bookshop name to convert to a slug
 * @returns A URL-friendly slug (e.g., "Powell's Books" → "powells-books")
 */
export function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();                  // Trim leading/trailing spaces
}

/**
 * Escape HTML entities to prevent XSS and ensure valid HTML
 * 
 * @param text - The text to escape
 * @returns Escaped HTML-safe text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
