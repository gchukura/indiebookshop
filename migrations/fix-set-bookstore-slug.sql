-- Fix set_bookstore_slug function to use fully qualified function names
-- This is needed because the function has SET search_path = ''
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION set_bookstore_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Use fully qualified function name since search_path is empty
    NEW.slug := public.generate_slug(NEW.name);
    
    -- If slug still conflicts, append city or ID
    -- Use fully qualified table and function names since search_path is empty
    WHILE EXISTS (SELECT 1 FROM public.bookstores WHERE slug = NEW.slug AND id != NEW.id) LOOP
      IF NEW.city IS NOT NULL AND NEW.city != '' THEN
        NEW.slug := public.generate_slug(NEW.name || ' ' || NEW.city);
      ELSE
        NEW.slug := public.generate_slug(NEW.name || ' ' || NEW.id::TEXT);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Verify the fix
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%public.generate_slug%' THEN '✓ FIXED'
    ELSE '✗ NEEDS FIX'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'set_bookstore_slug';



