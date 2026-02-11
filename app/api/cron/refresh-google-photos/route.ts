import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 25;
const DELAY_MS = 100;

/**
 * Vercel Cron: refresh Google Place photo references (and related fields) for a small batch of stale rows.
 * Called by vercel.json cron on schedule; also safe to call manually with CRON_SECRET_TOKEN.
 *
 * Photo refs expire; this keeps them fresh. For full refresh use GitHub Actions (see docs/setup/GOOGLE_PLACE_PHOTOS_REFRESH.md).
 */
export async function GET(request: NextRequest) {
  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const authHeader = request.headers.get('authorization');
  const tokenQuery = request.nextUrl.searchParams.get('token');
  const expectedToken = process.env.CRON_SECRET_TOKEN;
  if (expectedToken && tokenQuery !== expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!supabaseUrl || !supabaseKey || !apiKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GOOGLE_PLACES_API_KEY' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: bookshops, error: fetchError } = await supabase
    .from('bookstores')
    .select('id, name, google_place_id')
    .eq('live', true)
    .not('google_place_id', 'is', null)
    .or(`google_data_updated_at.is.null,google_data_updated_at.lt.${threeMonthsAgo.toISOString()}`)
    .order('id')
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('[cron/refresh-google-photos] Fetch error:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!bookshops?.length) {
    return NextResponse.json({
      success: true,
      refreshed: 0,
      failed: 0,
      total: 0,
      message: 'No stale bookshops to refresh',
    });
  }

  const fields = 'place_id,rating,user_ratings_total,editorial_summary,photos,reviews,price_level';
  let refreshed = 0;
  let failed = 0;

  for (const shop of bookshops) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
          `place_id=${encodeURIComponent(shop.google_place_id!)}` +
          `&fields=${fields}` +
          `&key=${apiKey}`
      );
      const data = await res.json();

      if (data.status !== 'OK' || !data.result) {
        failed++;
        continue;
      }

      const place = data.result;
      const updateData = {
        google_rating: place.rating?.toString() ?? null,
        google_review_count: place.user_ratings_total ?? null,
        google_description: place.editorial_summary?.overview ?? null,
        google_photos: place.photos?.slice(0, 5).map((p: { photo_reference: string }) => ({ photo_reference: p.photo_reference })) ?? null,
        google_reviews: place.reviews?.slice(0, 5).map((r: { author_name: string; rating: number; text: string; time: number }) => ({
          author_name: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.time,
        })) ?? null,
        google_price_level: place.price_level ?? null,
        google_data_updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase.from('bookstores').update(updateData).eq('id', shop.id);
      if (updateError) {
        failed++;
      } else {
        refreshed++;
      }
    } catch (e) {
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return NextResponse.json({
    success: true,
    refreshed,
    failed,
    total: bookshops.length,
  });
}
