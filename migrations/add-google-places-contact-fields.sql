-- Migration: Add Google Places Contact and Basic fields to bookstores table
-- This migration adds columns to store additional Google Places API data:
-- - Contact data: phone, website, opening hours
-- - Basic data: Google Maps URL, types, formatted address, business status
-- Run this migration in your Supabase SQL Editor

-- Add columns for missing Google Places data
ALTER TABLE bookstores 
ADD COLUMN IF NOT EXISTS formatted_phone TEXT,
ADD COLUMN IF NOT EXISTS website_verified TEXT,
ADD COLUMN IF NOT EXISTS opening_hours_json JSONB,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS google_types TEXT[],
ADD COLUMN IF NOT EXISTS formatted_address_google TEXT,
ADD COLUMN IF NOT EXISTS business_status TEXT,
ADD COLUMN IF NOT EXISTS contact_data_fetched_at TIMESTAMPTZ;

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_bookstores_contact_fetched 
ON bookstores(contact_data_fetched_at)
WHERE contact_data_fetched_at IS NOT NULL;

-- Add index for business status
CREATE INDEX IF NOT EXISTS idx_bookstores_business_status 
ON bookstores(business_status)
WHERE business_status IS NOT NULL;

-- Add index for website lookups
CREATE INDEX IF NOT EXISTS idx_bookstores_website_verified 
ON bookstores(website_verified)
WHERE website_verified IS NOT NULL;

-- Add comments to columns for documentation
COMMENT ON COLUMN bookstores.formatted_phone IS 'Formatted phone number from Google Places API';
COMMENT ON COLUMN bookstores.website_verified IS 'Verified website URL from Google Places API';
COMMENT ON COLUMN bookstores.opening_hours_json IS 'Opening hours data from Google Places API as JSONB (includes open_now, weekday_text, periods, utc_offset)';
COMMENT ON COLUMN bookstores.google_maps_url IS 'Google Maps URL for this bookshop';
COMMENT ON COLUMN bookstores.google_types IS 'Array of place types/categories from Google Places API';
COMMENT ON COLUMN bookstores.formatted_address_google IS 'Formatted full address string from Google Places API';
COMMENT ON COLUMN bookstores.business_status IS 'Business status from Google Places API (OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY, etc.)';
COMMENT ON COLUMN bookstores.contact_data_fetched_at IS 'Timestamp of when contact and basic data was last fetched from Google Places API';

