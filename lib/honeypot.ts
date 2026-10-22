/**
 * Honeypot spam check shared by the submission forms and their API routes.
 *
 * Forms render a hidden `website_url` input (components/HoneypotField.tsx) that
 * people never see or fill. Bots that fill every field trip it, and the route
 * returns a normal-looking success without sending email.
 */

export const HONEYPOT_FIELD = 'website_url';

/** True when the request body has a non-empty honeypot value. */
export function isHoneypotTripped(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}
