import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Places Photo Proxy (Next.js API Route)
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Extract photo_reference from query
  let photo_reference = searchParams.get('photo_reference');
  const maxwidth = searchParams.get('maxwidth') || '400';

  // Validate photo_reference
  if (!photo_reference) {
    return NextResponse.json({ error: 'photo_reference parameter is required' }, { status: 400 });
  }

  // Handle array case (shouldn't happen with Next.js, but be safe)
  if (Array.isArray(photo_reference)) {
    photo_reference = photo_reference[0];
  }

  // Ensure it's a string
  let photoRefString = String(photo_reference).trim();

  // Validate photo_reference format
  if (photoRefString.length < 10 || photoRefString.length > 2000) {
    return NextResponse.json({ 
      error: 'Invalid photo_reference format',
      details: `Photo reference length must be between 10 and 2000 characters, got ${photoRefString.length}`
    }, { status: 400 });
  }

  // Validate maxwidth
  const maxWidthNum = parseInt(maxwidth, 10);
  if (isNaN(maxWidthNum) || maxWidthNum < 1 || maxWidthNum > 1600) {
    return NextResponse.json({ error: 'maxwidth must be between 1 and 1600' }, { status: 400 });
  }

  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // Construct Google Places Photo API URL
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?` +
      `maxwidth=${maxWidthNum}` +
      `&photo_reference=${encodeURIComponent(photoRefString)}` +
      `&key=${GOOGLE_PLACES_API_KEY}`;

    // Fetch the photo from Google
    const response = await fetch(photoUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'IndieBookShop/1.0'
      }
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
