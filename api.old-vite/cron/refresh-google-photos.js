/**
 * Vercel Cron Job: Refresh Google Places Photo References
 * 
 * This cron job runs periodically to refresh expired Google Places photo references.
 * Photo references typically expire after 2-3 months, so we refresh them every 2 months.
 * 
 * Schedule: Runs on the 1st of every other month at 2 AM UTC
 * Cron expression: "0 2 1 */2 *" (every 2 months)
 * 
 * To test manually, you can call this endpoint directly or use:
 * curl -X GET https://your-site.vercel.app/api/cron/refresh-google-photos?token=YOUR_CRON_SECRET_TOKEN
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)
 * - GOOGLE_PLACES_API_KEY
 * - CRON_SECRET_TOKEN (optional, for security)
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add authentication to prevent unauthorized access
  // You can use a secret token in the query string or header
  const authToken = req.query.token || req.headers['x-cron-token'];
  const expectedToken = process.env.CRON_SECRET_TOKEN;
  
  if (expectedToken && authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log('[Cron] Starting Google Places photo refresh...');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all bookshops with Google Place IDs that need refreshing
    // Refresh photos older than 2 months (to refresh before they expire)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    console.log(`[Cron] Fetching bookshops with photos older than ${twoMonthsAgo.toISOString()}...`);

    let allBookshops = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: bookshops, error } = await supabase
        .from('bookstores')
        .select('id, name, google_place_id')
        .eq('live', true)
        .not('google_place_id', 'is', null)
        .or(`google_data_updated_at.is.null,google_data_updated_at.lt.${twoMonthsAgo.toISOString()}`)
        .order('id')
        .range(offset, offset + 1000 - 1)
        .limit(1000);

      if (error) {
        throw error;
      }

      if (!bookshops || bookshops.length === 0) {
        hasMore = false;
      } else {
        allBookshops = allBookshops.concat(bookshops);
        offset += 1000;
        hasMore = bookshops.length === 1000;
      }
    }

    console.log(`[Cron] Found ${allBookshops.length} bookshops to refresh`);

    if (allBookshops.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No bookshops need refreshing',
        refreshed: 0,
        duration: Date.now() - startTime
      });
    }

    // Import the enrichment function
    // Note: We'll need to extract the enrichment logic or call it differently
    // For now, we'll use a simplified approach that calls the Google Places API
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY not configured');
    }

    let successCount = 0;
    let failCount = 0;
    const batchSize = 10; // Process in smaller batches to avoid timeout
    const delayMs = 100; // Rate limiting delay

    // Process bookshops in batches
    for (let i = 0; i < allBookshops.length; i += batchSize) {
      const batch = allBookshops.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (bookshop) => {
        try {
          // Fetch fresh Google Places data
          const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?` +
            `place_id=${encodeURIComponent(bookshop.google_place_id)}` +
            `&fields=photos,rating,user_ratings_total,editorial_summary,reviews,price_level` +
            `&key=${GOOGLE_PLACES_API_KEY}`;

          const response = await fetch(placeDetailsUrl);
          const data = await response.json();

          if (data.status !== 'OK' || !data.result) {
            console.warn(`[Cron] Failed to fetch details for ${bookshop.name}: ${data.status}`);
            failCount++;
            return;
          }

          const place = data.result;

          // Update photo references
          const updateData = {
            google_photos: place.photos?.slice(0, 5).map(p => ({ photo_reference: p.photo_reference })) || null,
            google_rating: place.rating?.toString() || null,
            google_review_count: place.user_ratings_total || null,
            google_description: place.editorial_summary?.overview || null,
            google_reviews: place.reviews?.slice(0, 5).map(r => ({
              author_name: r.author_name,
              rating: r.rating,
              text: r.text,
              time: r.time
            })) || null,
            google_price_level: place.price_level || null,
            google_data_updated_at: new Date().toISOString()
          };

          const { error: updateError } = await supabase
            .from('bookstores')
            .update(updateData)
            .eq('id', bookshop.id);

          if (updateError) {
            throw updateError;
          }

          successCount++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (error) {
          console.error(`[Cron] Error refreshing ${bookshop.name}:`, error.message);
          failCount++;
        }
      }));

      // Log progress
      if ((i + batchSize) % 100 === 0 || i + batchSize >= allBookshops.length) {
        console.log(`[Cron] Progress: ${Math.min(i + batchSize, allBookshops.length)}/${allBookshops.length}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Refresh complete: ${successCount} succeeded, ${failCount} failed in ${duration}ms`);

    return res.status(200).json({
      success: true,
      refreshed: successCount,
      failed: failCount,
      total: allBookshops.length,
      duration
    });
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}

