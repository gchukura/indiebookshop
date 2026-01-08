-- Fix Remaining Functions: bookstore_auto_convert and clean_ai_description
-- Run this after the main migration to fix the two remaining functions
-- These functions were detected but need explicit fixes

-- ============================================================================
-- Fix 1: bookstore_auto_convert
-- ============================================================================
-- This is a trigger function that converts lat/lng to PostGIS geography
-- Note: PostGIS functions are in the public schema, so we qualify them explicitly
CREATE OR REPLACE FUNCTION bookstore_auto_convert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only update location if lng_numeric and lat_numeric are present AND geography type exists
  IF NEW.lng_numeric IS NOT NULL AND NEW.lat_numeric IS NOT NULL THEN
    BEGIN
      -- Try to use geography type, but catch error if it doesn't exist
      -- PostGIS functions are in public schema (since postgis extension is in public)
      NEW.location := public.ST_SetSRID(
        public.ST_MakePoint(NEW.lng_numeric, NEW.lat_numeric), 
        4326
      )::geography;
    EXCEPTION
      WHEN undefined_object THEN
        -- Geography type doesn't exist, skip location update
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Fix 2: clean_ai_description
-- ============================================================================
-- This function cleans AI-generated descriptions
-- Note: Built-in PostgreSQL functions (SPLIT_PART, REGEXP_REPLACE, etc.) are always available
-- and don't need schema qualification even with empty search_path
CREATE OR REPLACE FUNCTION clean_ai_description(full_description TEXT, bookstore_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  cleaned TEXT;
  first_two_sentences TEXT;
BEGIN
  -- Extract everything before the second newline (first paragraph)
  first_two_sentences := SPLIT_PART(full_description, E'\n\n', 1);
  
  -- Remove common formulaic phrases
  cleaned := first_two_sentences;
  cleaned := REGEXP_REPLACE(cleaned, 'This (locally-owned establishment|bookshop) (provides|offers) (readers with )?access to ', 'They offer ', 'g');
  cleaned := REGEXP_REPLACE(cleaned, 'offering readers access to ', 'offering ', 'g');
  cleaned := REGEXP_REPLACE(cleaned, '\. The bookshop also provides ', ' and ', 'g');
  cleaned := REGEXP_REPLACE(cleaned, 'this bookshop', 'they', 'gi');
  cleaned := REGEXP_REPLACE(cleaned, 'the bookshop', 'they', 'gi');
  
  -- Limit to approximately 250 characters by truncating at sentence boundary
  IF LENGTH(cleaned) > 300 THEN
    -- Find the second period
    cleaned := SUBSTRING(
      cleaned 
      FROM 1 
      FOR POSITION('.' IN SUBSTRING(cleaned FROM POSITION('.' IN cleaned) + 1)) + POSITION('.' IN cleaned)
    );
  END IF;
  
  RETURN TRIM(cleaned);
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================
-- Check that both functions now have search_path set
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'FIXED'
    ELSE 'NEEDS FIX'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('bookstore_auto_convert', 'clean_ai_description')
ORDER BY p.proname;



