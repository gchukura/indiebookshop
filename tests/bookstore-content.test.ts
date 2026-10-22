import { describe, expect, it } from 'vitest';
import { getBookstoreDescription } from '@/lib/data/bookstore-content';

const base = {
  name: 'Test Books',
  city: 'Nashville',
  state: 'TN',
  description: null,
  googleDescription: null,
  aiGeneratedDescription: null,
  descriptionValidated: null,
};

describe('getBookstoreDescription', () => {
  it('prefers the Sheet description', () => {
    const d = getBookstoreDescription({ ...base, description: ' Own text ', googleDescription: 'Google text' });
    expect(d).toEqual({ text: 'Own text', source: 'description' });
  });

  it('falls back to the Google description', () => {
    const d = getBookstoreDescription({ ...base, description: '   ', googleDescription: 'Google text' });
    expect(d).toEqual({ text: 'Google text', source: 'google' });
  });

  it('uses the AI description only when validated', () => {
    expect(getBookstoreDescription({ ...base, aiGeneratedDescription: 'AI text', descriptionValidated: true }))
      .toEqual({ text: 'AI text', source: 'ai' });
    expect(getBookstoreDescription({ ...base, aiGeneratedDescription: 'AI text', descriptionValidated: false }).source)
      .toBe('template');
  });

  it('falls back to a template naming the shop and location', () => {
    const d = getBookstoreDescription(base);
    expect(d.source).toBe('template');
    expect(d.text).toMatch(/^Test Books is an independent bookstore in Nashville, TN\./);
  });
});
