import { NextResponse } from 'next/server';
import { getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { getLocationIndex } from '@/lib/data/locations';
import { buildSuggestionEntries, suggest } from '@/lib/data/suggest';

/**
 * GET /api/suggest?q=berk → up to 8 states, cities, and shops for the
 * homepage search box. The full list (~155 KB) is too big to ship with the page.
 */

let cached: { data: unknown; entries: ReturnType<typeof buildSuggestionEntries> } | null = null;

async function getEntries() {
  const [data, locations] = await Promise.all([getProcessedBookstoreData(), getLocationIndex()]);
  if (cached?.data !== data) cached = { data, entries: buildSuggestionEntries(locations, data.all) };
  return cached.entries;
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 80);
  try {
    const suggestions = suggest(await getEntries(), q);
    return NextResponse.json(suggestions, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('[suggest]', err);
    return NextResponse.json([], { status: 500 });
  }
}
