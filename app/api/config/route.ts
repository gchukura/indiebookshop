import { NextResponse } from 'next/server';

/**
 * API route to provide public configuration to client components
 * Returns Mapbox access token for map rendering
 *
 * SECURITY NOTES:
 * - This endpoint exposes the Mapbox access token to the client (required for Mapbox GL JS)
 * - The token should be restricted in Mapbox dashboard:
 *   1. Set URL restrictions to only allow your domain(s)
 *   2. Use a public token (pk.*) not a secret token (sk.*)
 *   3. Limit scopes to only what's needed (e.g., styles:read, fonts:read)
 *   4. Set rate limits in Mapbox dashboard
 */
export async function GET() {
  // Mapbox token should be in environment variables
  // NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is exposed to browser
  // If not set, try MAPBOX_ACCESS_TOKEN (server-only)
  const mapboxAccessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    '';

  // Validate token format (should be a public token starting with 'pk.')
  if (mapboxAccessToken && !mapboxAccessToken.startsWith('pk.')) {
    console.warn('WARNING: Mapbox token does not appear to be a public token (should start with "pk.")');
  }

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
  }, {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}
