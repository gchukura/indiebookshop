import { NextResponse } from 'next/server';

/**
 * Get client-side configuration (e.g., Mapbox access token)
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
  // Only expose token if it exists
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || '';
  
  // Validate token format (should be a public token starting with 'pk.')
  if (mapboxToken && !mapboxToken.startsWith('pk.')) {
    console.warn('WARNING: Mapbox token does not appear to be a public token (should start with "pk.")');
  }
  
  return NextResponse.json({
    mapboxAccessToken: mapboxToken
  }, {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}
