-- Fix Function Search Path Security Warnings
-- Run this in Supabase SQL Editor to fix the search_path security warnings
--
-- ISSUE: Functions without SET search_path are vulnerable to search_path injection attacks
-- SOLUTION: Add SET search_path = '' or SET search_path = 'public' to function definitions
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix 1: generate_slug function
-- Add SET search_path = '' to prevent search_path injection
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN '';
  END IF;
  
  RETURN lower(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ),
        '^-+|-+$', '', 'g'
      )
    )
  );
END;
$$;

-- Fix 2: set_bookstore_slug trigger function
-- Add SET search_path = '' to prevent search_path injection
-- Note: We need to use fully qualified table names when search_path is empty
CREATE OR REPLACE FUNCTION set_bookstore_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
    
    -- If slug still conflicts, append city or ID
    -- Use fully qualified table name since search_path is empty
    WHILE EXISTS (SELECT 1 FROM public.bookstores WHERE slug = NEW.slug AND id != NEW.id) LOOP
      IF NEW.city IS NOT NULL AND NEW.city != '' THEN
        NEW.slug := generate_slug(NEW.name || ' ' || NEW.city);
      ELSE
        NEW.slug := generate_slug(NEW.name || ' ' || NEW.id::TEXT);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Verify the fixes
-- Run these queries to confirm search_path is set:

-- Check generate_slug function
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_slug';

-- Check set_bookstore_slug function
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'set_bookstore_slug';

-- Both functions should now show "SET search_path = ''" in their definitions

