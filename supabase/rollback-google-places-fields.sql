-- Rollback Migration: Remove Google Places API enrichment fields from bookstores table
-- Use this script to revert the add-google-places-fields.sql migration if needed
-- WARNING: This will permanently delete all Google Places data!

-- Drop indexes first
DROP INDEX IF EXISTS public.idx_bookstores_google_rating;
DROP INDEX IF EXISTS public.idx_bookstores_google_data_updated_at;
DROP INDEX IF EXISTS public.idx_bookstores_google_place_id;

-- Drop constraints
ALTER TABLE public.bookstores
DROP CONSTRAINT IF EXISTS check_google_rating_format;

ALTER TABLE public.bookstores
DROP CONSTRAINT IF EXISTS check_google_price_level_range;

-- Drop columns
ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_data_updated_at;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_price_level;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_reviews;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_photos;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_description;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_review_count;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_rating;

ALTER TABLE public.bookstores
DROP COLUMN IF EXISTS google_place_id;




