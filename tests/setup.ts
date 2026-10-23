/**
 * Vitest setup: run the data layer outside Next.
 * - USE_FIXTURE_DATA=1 reads tests/fixtures/bookstores.json instead of the Sheet
 * - unstable_cache and React's cache() (only in Next's React build) become pass-throughs
 */
import { vi } from 'vitest';

process.env.USE_FIXTURE_DATA = '1';

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: (actual as { cache?: unknown }).cache ?? (<T,>(fn: T) => fn) };
});
