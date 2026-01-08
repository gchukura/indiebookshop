-- Migration: Add Google Places API enrichment fields to bookstores table
-- This migration adds columns to store Google Places API data for bookshop enrichment
-- Run this migration in your Supabase SQL Editor or via migration tool

-- Add Google Place ID column
-- This stores the unique Google Place ID for each bookshop
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Add Google rating column
-- Stored as TEXT to match the pattern used for latitude/longitude fields
-- Rating values are typically decimal numbers (e.g., "4.5")
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_rating TEXT;

-- Add Google review count column
-- Stores the total number of reviews from Google Places
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Add Google description column
-- Stores the editorial summary/overview from Google Places
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_description TEXT;

-- Add Google photos column
-- Stores an array of photo references as JSONB
-- Structure: [{"photo_reference": "string"}, ...]
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_photos JSONB;

-- Add Google reviews column
-- Stores an array of review objects as JSONB
-- Structure: [{"author_name": "string", "rating": number, "text": "string", "time": number}, ...]
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_reviews JSONB;

-- Add Google price level column
-- Stores price level on a scale of 0-4 (0 = free, 4 = very expensive)
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_price_level INTEGER;

-- Add Google data updated timestamp
-- Tracks when the Google Places data was last refreshed
ALTER TABLE public.bookstores
ADD COLUMN IF NOT EXISTS google_data_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index on google_place_id for faster lookups
-- This helps when checking if a bookshop already has Google Places data
CREATE INDEX IF NOT EXISTS idx_bookstores_google_place_id
ON public.bookstores(google_place_id)
WHERE google_place_id IS NOT NULL;

-- Create index on google_data_updated_at for finding stale data
-- This helps identify bookshops that need data refresh
CREATE INDEX IF NOT EXISTS idx_bookstores_google_data_updated_at
ON public.bookstores(google_data_updated_at)
WHERE google_data_updated_at IS NOT NULL;

-- Create index on google_rating for filtering/sorting by rating
-- This helps with queries that filter or sort by Google ratings
CREATE INDEX IF NOT EXISTS idx_bookstores_google_rating
ON public.bookstores(google_rating)
WHERE google_rating IS NOT NULL;

-- Add comments to columns for documentation
COMMENT ON COLUMN public.bookstores.google_place_id IS 'Google Places API Place ID for this bookshop';
COMMENT ON COLUMN public.bookstores.google_rating IS 'Average rating from Google Places (stored as text, e.g., "4.5")';
COMMENT ON COLUMN public.bookstores.google_review_count IS 'Total number of reviews from Google Places';
COMMENT ON COLUMN public.bookstores.google_description IS 'Editorial summary/overview from Google Places';
COMMENT ON COLUMN public.bookstores.google_photos IS 'Array of Google Places photo references as JSONB';
COMMENT ON COLUMN public.bookstores.google_reviews IS 'Array of Google Places reviews as JSONB';
COMMENT ON COLUMN public.bookstores.google_price_level IS 'Price level from Google Places (0-4 scale)';
COMMENT ON COLUMN public.bookstores.google_data_updated_at IS 'Timestamp of when Google Places data was last refreshed';

-- Add constraint to validate price_level range (0-4)
-- This ensures price_level values are within the valid Google Places range
ALTER TABLE public.bookstores
ADD CONSTRAINT check_google_price_level_range
CHECK (google_price_level IS NULL OR (google_price_level >= 0 AND google_price_level <= 4));

-- Add constraint to validate rating format (optional, but helpful)
-- Ensures rating is a valid decimal number if provided
-- Note: This uses a regex pattern to validate decimal numbers
ALTER TABLE public.bookstores
ADD CONSTRAINT check_google_rating_format
CHECK (
  google_rating IS NULL OR 
  google_rating ~ '^[0-9]+(\.[0-9]+)?$'
);




