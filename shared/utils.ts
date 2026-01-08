/**
 * Shared utility functions used across server and client
 * These functions must be identical on both sides to ensure consistency
 */

/**
 * Generate a clean slug from a bookshop name
 * This function must match exactly between server and client implementations
 * 
 * @param name The bookshop name
 * @returns A URL-friendly slug
 */
export function generateSlugFromName(name: string): string {
  // Handle null/undefined/empty names defensively
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
 * @param text The text to escape
 * @returns Escaped HTML string
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
