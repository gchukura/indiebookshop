/**
 * Shared Google Places Photo Proxy Handler
 * 
 * This utility provides a reusable handler for proxying Google Places photos.
 * Used by both serverless and server implementations to avoid code duplication.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function handlePlacePhotoRequest(req, res) {
  const { photo_reference, maxwidth = '400' } = req.query;

  // Log the incoming request for debugging
  console.log('place-photo: Request received', {
    hasPhotoRef: !!photo_reference,
    photoRefType: typeof photo_reference,
    photoRefLength: photo_reference?.length,
    photoRefPreview: photo_reference ? photo_reference.substring(0, 100) : null
  });

  // Validate photo_reference
  if (!photo_reference) {
    console.error('place-photo: Missing photo_reference parameter');
    return res.status(400).json({ error: 'photo_reference parameter is required' });
  }

  // Handle both string and object formats (in case it's passed as JSON)
  let photoRefString = photo_reference;
  if (typeof photo_reference === 'object') {
    photoRefString = photo_reference.photo_reference || photo_reference.photoReference || String(photo_reference);
    console.warn('place-photo: photo_reference was an object, extracted:', photoRefString?.substring(0, 50));
  }
  
  if (typeof photoRefString !== 'string') {
    console.error('place-photo: Invalid photo_reference type', { type: typeof photoRefString, value: photoRefString });
    return res.status(400).json({ error: 'photo_reference must be a string' });
  }

  // Validate photo_reference format (Google uses base64-like strings, can be 100-2000+ chars)
  // Some photo references are very long, so we allow up to 2000 characters
  if (photoRefString.length < 10 || photoRefString.length > 2000) {
    console.error('place-photo: Invalid photo_reference length', { 
      length: photoRefString.length,
      preview: photoRefString.substring(0, 50) + '...'
    });
    return res.status(400).json({ 
      error: 'Invalid photo_reference format',
      details: `Photo reference length must be between 10 and 2000 characters, got ${photoRefString.length}`
    });
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
      `&photo_reference=${encodeURIComponent(photoRefString)}` +
      `&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('place-photo: Fetching from Google', {
      photoRefLength: photoRefString.length,
      maxWidth: maxWidthNum
    });

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

    // Validate content type before processing
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.error('Google Places API returned non-image content:', contentType);
      return res.status(502).json({ error: 'Invalid response from photo service' });
    }

    // Get the image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('Content-Length', buffer.length.toString());

    // Send the image
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching Google Places photo:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

