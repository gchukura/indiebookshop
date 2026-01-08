-- Fix All Supabase Security Warnings
-- Run this in Supabase SQL Editor to fix all function search_path and extension schema warnings
--
-- ISSUES ADDRESSED:
-- 1. Function Search Path Mutable - Functions without SET search_path are vulnerable to search_path injection attacks
-- 2. Extension in Public Schema - Extensions should be in a dedicated schema for better security isolation
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

-- ============================================================================
-- PART 1: Fix Function Search Path Issues
-- ============================================================================
-- All functions need SET search_path = '' or SET search_path = 'public' to prevent injection attacks
-- When using SET search_path = '', we must use fully qualified names (schema.table)

-- Fix 1: update_google_contact_data
CREATE OR REPLACE FUNCTION update_google_contact_data(
  p_bookshop_id INTEGER,
  p_formatted_phone TEXT,
  p_website_verified TEXT,
  p_opening_hours_json JSONB,
  p_google_maps_url TEXT,
  p_google_types TEXT[],
  p_formatted_address_google TEXT,
  p_business_status TEXT,
  p_contact_data_fetched_at TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Get all triggers on the bookstores table
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
  -- Perform the update
  UPDATE public.bookstores
  SET 
    formatted_phone = p_formatted_phone,
    website_verified = p_website_verified,
    opening_hours_json = p_opening_hours_json,
    google_maps_url = p_google_maps_url,
    google_types = p_google_types,
    formatted_address_google = p_formatted_address_google,
    business_status = p_business_status,
    contact_data_fetched_at = p_contact_data_fetched_at
  WHERE id = p_bookshop_id;
  
  -- Re-enable all triggers
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure triggers are re-enabled even if update fails
    FOR v_trigger_name IN 
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'bookstores'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
      EXCEPTION
        WHEN OTHERS THEN
          NULL; -- Ignore errors when re-enabling
      END;
    END LOOP;
    RAISE;
END;
$$;

-- Fix 2: update_ai_description (version with p_validated parameter)
CREATE OR REPLACE FUNCTION update_ai_description(
  p_bookshop_id INTEGER,
  p_description TEXT,
  p_generated_at TIMESTAMPTZ,
  p_validated BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Temporarily disable triggers to avoid geography type errors
  FOR v_trigger_name IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;

  UPDATE public.bookstores
  SET 
    ai_generated_description = p_description,
    description_generated_at = p_generated_at,
    description_validated = p_validated
  WHERE id = p_bookshop_id;

  -- Re-enable triggers
  FOR v_trigger_name IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    -- Make sure triggers are re-enabled even if update fails
    FOR v_trigger_name IN
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'bookstores'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;
    END LOOP;
    RAISE;
END;
$$;

-- Fix 3: update_ai_description (version without p_validated parameter - for backward compatibility)
CREATE OR REPLACE FUNCTION update_ai_description(
  p_bookshop_id INTEGER,
  p_description TEXT,
  p_generated_at TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Get all triggers on the bookstores table
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
  -- Perform the update
  UPDATE public.bookstores
  SET 
    ai_generated_description = p_description,
    description_generated_at = p_generated_at
  WHERE id = p_bookshop_id;
  
  -- Re-enable all triggers
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure triggers are re-enabled even if update fails
    FOR v_trigger_name IN 
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'bookstores'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
      EXCEPTION
        WHEN OTHERS THEN
          NULL; -- Ignore errors when re-enabling
      END;
    END LOOP;
    RAISE;
END;
$$;

-- Fix 4: update_google_places_data
CREATE OR REPLACE FUNCTION update_google_places_data(
  p_bookshop_id INTEGER,
  p_google_place_id TEXT,
  p_google_rating TEXT,
  p_google_review_count INTEGER,
  p_google_description TEXT,
  p_google_photos JSONB,
  p_google_reviews JSONB,
  p_google_price_level INTEGER,
  p_google_data_updated_at TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Get all triggers on the bookstores table
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
  -- Perform the update
  UPDATE public.bookstores
  SET 
    google_place_id = p_google_place_id,
    google_rating = p_google_rating,
    google_review_count = p_google_review_count,
    google_description = p_google_description,
    google_photos = p_google_photos,
    google_reviews = p_google_reviews,
    google_price_level = p_google_price_level,
    google_data_updated_at = p_google_data_updated_at
  WHERE id = p_bookshop_id;
  
  -- Re-enable all triggers
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure triggers are re-enabled even if update fails
    FOR v_trigger_name IN 
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'bookstores'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
      EXCEPTION
        WHEN OTHERS THEN
          NULL; -- Ignore errors when re-enabling
      END;
    END LOOP;
    RAISE;
END;
$$;

-- Fix 5: update_google_place_id
CREATE OR REPLACE FUNCTION update_google_place_id(
  p_bookshop_id INTEGER,
  p_google_place_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Get all triggers on the bookstores table
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
  -- Perform the update
  UPDATE public.bookstores
  SET google_place_id = p_google_place_id
  WHERE id = p_bookshop_id;
  
  -- Re-enable all triggers
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure triggers are re-enabled even if update fails
    FOR v_trigger_name IN 
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'bookstores'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
      EXCEPTION
        WHEN OTHERS THEN
          NULL; -- Ignore errors when re-enabling
      END;
    END LOOP;
    RAISE;
END;
$$;

-- Fix 6: bookstore_auto_convert
-- This is a trigger function that converts lat/lng to PostGIS geography
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
      -- Use fully qualified PostGIS functions (they're in public schema)
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

-- Fix 7: clean_ai_description
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
-- PART 2: Move Extensions to Extensions Schema
-- ============================================================================
-- NOTE: This requires database owner permissions. If you don't have owner permissions,
-- you'll need to contact Supabase support or run this as a database owner.

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move postgis extension from public to extensions schema
-- This will fail if you don't have owner permissions - that's expected
DO $$
BEGIN
  -- Check if postgis extension exists in public schema
  IF EXISTS (
    SELECT 1 
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND e.extname = 'postgis'
  ) THEN
    -- Try to move it
    BEGIN
      ALTER EXTENSION postgis SET SCHEMA extensions;
      RAISE NOTICE 'Successfully moved postgis extension to extensions schema';
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE WARNING 'Insufficient privileges to move postgis extension. Contact Supabase support or run as database owner.';
      WHEN OTHERS THEN
        RAISE WARNING 'Error moving postgis extension: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'postgis extension not found in public schema (may already be moved or not installed)';
  END IF;
END $$;

-- Move pg_trgm extension from public to extensions schema
DO $$
BEGIN
  -- Check if pg_trgm extension exists in public schema
  IF EXISTS (
    SELECT 1 
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND e.extname = 'pg_trgm'
  ) THEN
    -- Try to move it
    BEGIN
      ALTER EXTENSION pg_trgm SET SCHEMA extensions;
      RAISE NOTICE 'Successfully moved pg_trgm extension to extensions schema';
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE WARNING 'Insufficient privileges to move pg_trgm extension. Contact Supabase support or run as database owner.';
      WHEN OTHERS THEN
        RAISE WARNING 'Error moving pg_trgm extension: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_trgm extension not found in public schema (may already be moved or not installed)';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Verification Queries
-- ============================================================================
-- Run these queries to verify the fixes were applied

-- Check function search_path settings
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'FIXED'
    ELSE 'NEEDS FIX'
  END as search_path_status,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_google_contact_data',
    'update_ai_description',
    'update_google_places_data',
    'update_google_place_id',
    'bookstore_auto_convert',
    'clean_ai_description'
  )
ORDER BY p.proname;

-- Check extension locations
SELECT 
  e.extname as extension_name,
  n.nspname as schema_name,
  CASE 
    WHEN n.nspname = 'extensions' THEN 'FIXED'
    WHEN n.nspname = 'public' THEN 'NEEDS FIX'
    ELSE 'OTHER'
  END as status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname IN ('postgis', 'pg_trgm')
ORDER BY e.extname;

