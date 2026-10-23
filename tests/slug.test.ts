import { describe, expect, it } from 'vitest';
import { generateSlugFromName, getBookstoreSlug } from '@/lib/data/slug';

describe('generateSlugFromName', () => {
  it('lowercases, drops punctuation, and hyphenates spaces', () => {
    expect(generateSlugFromName("Powell's Books")).toBe('powells-books');
    expect(generateSlugFromName('Books & Info Shop')).toBe('books-info-shop');
  });

  it('collapses repeated and trims edge hyphens', () => {
    expect(generateSlugFromName('  -- The   Book -- Nook --  ')).toBe('the-book-nook');
  });

  it('keeps existing hyphens and digits', () => {
    expect(generateSlugFromName('Winston-Salem Books 2')).toBe('winston-salem-books-2');
  });

  it('returns an empty string for empty input', () => {
    expect(generateSlugFromName('')).toBe('');
  });
});

describe('getBookstoreSlug', () => {
  it('prefers the Sheet slug', () => {
    expect(getBookstoreSlug({ slug: 'custom-slug', name: 'Anything' })).toBe('custom-slug');
  });

  it('falls back to the generated slug', () => {
    expect(getBookstoreSlug({ slug: null, name: 'Parnassus Books' })).toBe('parnassus-books');
  });
});
