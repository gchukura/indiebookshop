import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Places Photo Proxy (Next.js API Route)
 *
 * Proxies Google Places photos so the API key is not exposed to the client.
 *
 * Usage:
 *   GET /api/place-photo?photo_reference=PHOTO_REF&maxwidth=400
 *
 * Note: Photo references expire. If you get 400 errors, refresh stored refs
 * by re-running enrichment: see docs/setup/GOOGLE_PLACE_PHOTOS_REFRESH.md
 *
 * Env: GOOGLE_PLACES_API_KEY
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Extract photo_reference from query
  let photo_reference = searchParams.get('photo_reference');
  const maxwidth = searchParams.get('maxwidth') || '400';

  // Validate photo_reference present
  if (photo_reference === null || photo_reference === undefined || photo_reference === '') {
    return NextResponse.json({ error: 'photo_reference parameter is required' }, { status: 400 });
  }

  // Handle array case (shouldn't happen with Next.js, but be safe)
  if (Array.isArray(photo_reference)) {
    photo_reference = photo_reference[0];
  }

  // Ensure it's a string and extract ref if a stringified object was passed
  let photoRefString = String(photo_reference).trim();
  if (photoRefString.startsWith('{')) {
    try {
      const parsed = JSON.parse(photoRefString) as { photo_reference?: string; photoReference?: string };
      photoRefString = (parsed.photo_reference ?? parsed.photoReference ?? '').trim();
    } catch {
      // leave as-is
    }
  }

  // Validate photo_reference format (Google refs are opaque; allow 10–8000 chars)
  if (photoRefString.length < 10) {
    return NextResponse.json({ 
      error: 'Invalid photo_reference format',
      details: `Photo reference too short (${photoRefString.length} chars). Must be at least 10 characters.`
    }, { status: 400 });
  }
  if (photoRefString.length > 8000) {
    return NextResponse.json({ 
      error: 'Invalid photo_reference format',
      details: `Photo reference too long (${photoRefString.length} chars). Max 8000.`
    }, { status: 400 });
  }

  // Validate maxwidth (Google allows 1–4800 for New API; legacy supports similar)
  const maxWidthNum = parseInt(maxwidth, 10);
  if (isNaN(maxWidthNum) || maxWidthNum < 1 || maxWidthNum > 4800) {
    return NextResponse.json({ error: 'maxwidth must be between 1 and 4800' }, { status: 400 });
  }

  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // Support both Legacy and New Places Photo APIs
    // New API: photo "name" from Place Details is "places/placeId/photos/photoRef" — we must append "/media"
    // Legacy API: photo_reference is a shorter opaque string
    const isNewApiName = photoRefString.startsWith('places/');
    const pathName = isNewApiName
      ? (photoRefString.endsWith('/media') ? photoRefString : `${photoRefString}/media`)
      : null;
    const photoUrl = isNewApiName && pathName
      ? `https://places.googleapis.com/v1/${pathName}?maxWidthPx=${maxWidthNum}&key=${GOOGLE_PLACES_API_KEY}`
      : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidthNum}&photo_reference=${encodeURIComponent(photoRefString)}&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(photoUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'IndieBookShop/1.0' }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error(`Google Places Photo API returned status ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200)
      });
      return NextResponse.json({ 
        error: 'Failed to fetch photo from Google Places API',
        details: `Google API returned status ${response.status}`
      }, { status: response.status });
    }

    // Get the content type from Google's response
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Stream the image data to the client
    const imageData = await response.arrayBuffer();

    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
