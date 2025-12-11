/**
 * Google Places Photo Proxy
 * 
 * This endpoint securely proxies Google Places photos to avoid exposing
 * the API key in frontend code. It fetches the photo from Google Places API
 * and streams it to the client.
 * 
 * Usage:
 *   GET /api/place-photo?photo_reference=PHOTO_REF&maxwidth=400
 * 
 * Environment Variables Required:
 *   - GOOGLE_PLACES_API_KEY: Your Google Places API key
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { photo_reference, maxwidth = '400' } = req.query;

  // Validate photo_reference
  if (!photo_reference || typeof photo_reference !== 'string') {
    return res.status(400).json({ error: 'photo_reference parameter is required' });
  }

  // Validate maxwidth
  const maxWidthNum = parseInt(maxwidth, 10);
  if (isNaN(maxWidthNum) || maxWidthNum < 1 || maxWidthNum > 1600) {
    return res.status(400).json({ error: 'maxwidth must be between 1 and 1600' });
  }

  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Construct Google Places Photo API URL
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?` +
      `maxwidth=${maxWidthNum}` +
      `&photo_reference=${encodeURIComponent(photo_reference)}` +
      `&key=${GOOGLE_PLACES_API_KEY}`;

    // Fetch the photo from Google
    const response = await fetch(photoUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'IndieBookShop/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Google Places Photo API returned status ${response.status}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch photo from Google Places API' 
      });
    }

    // Get the image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get content type from response (default to jpeg)
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('Content-Length', buffer.length);

    // Send the image
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching Google Places photo:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


