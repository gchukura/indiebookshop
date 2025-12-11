/**
 * Google Places Photo Proxy (Serverless)
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

import { handlePlacePhotoRequest } from './utils/place-photo-handler.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return handlePlacePhotoRequest(req, res);
}
