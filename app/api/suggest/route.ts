import { NextResponse } from 'next/server';
import { getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { getLocationIndex } from '@/lib/data/locations';
import { suggest } from '@/lib/data/search';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/suggest?q=berk → up to 8 places and shops for the search boxes
 * (homepage hero and header). Uses the same matcher as /search and the
 * directory. The full name list (~155 KB) is too big to ship with the page.
 */
export async function GET(request: Request) {
  const limited = await checkRateLimit(request, RATE_LIMITS.suggest);
  if (limited) return limited;

  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 80);
  try {
    const [data, locations] = await Promise.all([getProcessedBookstoreData(), getLocationIndex()]);
    return NextResponse.json(suggest(locations, data.all, q), {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('[suggest]', err);
    return NextResponse.json([], { status: 500 });
  }
}
