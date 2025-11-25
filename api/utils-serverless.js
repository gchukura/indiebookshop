// Utility functions for serverless routes

/**
 * Escape HTML entities to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text);
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.trim().length <= 254;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(date) {
  if (typeof date !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Validate time format (HH:MM or HH:MM:SS)
 * @param {string} time - Time string to validate
 * @returns {boolean} True if valid
 */
export function isValidTime(time) {
  if (typeof time !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return timeRegex.test(time);
}

/**
 * Safely parse integer with validation
 * @param {any} value - Value to parse
 * @param {number} min - Minimum value (default: 1)
 * @returns {number|null} Parsed integer or null if invalid
 */
export function safeParseInt(value, min = 1) {
  if (value === null || value === undefined) return null;
  const parsed = parseInt(String(value), 10);
  if (isNaN(parsed) || parsed < min) return null;
  return parsed;
}

/**
 * Check if we're in development mode
 * @returns {boolean} True if development
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

