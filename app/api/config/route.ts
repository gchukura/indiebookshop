import { NextResponse } from 'next/server';

/**
 * API route to provide public configuration to client components
 * Returns Mapbox access token for map rendering
 */
export async function GET() {
  // Mapbox token should be in environment variables
  // NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is exposed to browser
  // If not set, try MAPBOX_ACCESS_TOKEN (server-only)
  const mapboxAccessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    '';

  if (!mapboxAccessToken) {
    console.warn('Mapbox access token not found in environment variables');
    return NextResponse.json(
      {
        error: 'Map configuration not available',
        mapboxAccessToken: null
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    mapboxAccessToken,
  });
}
