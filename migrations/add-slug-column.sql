-- Migration: Add slug column to bookstores table
-- Run this in Supabase SQL Editor

-- Step 1: Add slug column
ALTER TABLE bookstores 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bookstores_slug 
ON bookstores(slug) 
WHERE slug IS NOT NULL;

-- Step 3: Create slug generation function
-- This matches the JavaScript generateSlugFromName function
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Generate slugs for all existing bookshops
-- Temporarily disable the bookstore_auto_convert trigger that uses PostGIS
-- (if it exists - this prevents PostGIS geography errors during bulk updates)
DO $$
BEGIN
  -- Check if the trigger exists and disable it
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bookstore_auto_convert' 
    AND tgrelid = 'bookstores'::regclass
  ) THEN
    ALTER TABLE bookstores DISABLE TRIGGER bookstore_auto_convert;
    RAISE NOTICE 'Disabled bookstore_auto_convert trigger';
  END IF;
END $$;

UPDATE bookstores 
SET slug = generate_slug(name)
WHERE slug IS NULL OR slug = '';

-- Re-enable the trigger if it was disabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bookstore_auto_convert' 
    AND tgrelid = 'bookstores'::regclass
    AND NOT tgisinternal
  ) THEN
    ALTER TABLE bookstores ENABLE TRIGGER bookstore_auto_convert;
    RAISE NOTICE 'Re-enabled bookstore_auto_convert trigger';
  END IF;
END $$;

-- Step 5: Check for duplicate slugs
-- Run this query to see duplicates:
-- SELECT slug, COUNT(*) as count, array_agg(name) as names
-- FROM bookstores
-- WHERE slug IS NOT NULL AND slug != ''
-- GROUP BY slug
-- HAVING COUNT(*) > 1
-- ORDER BY count DESC;

-- Step 6: Handle duplicates by appending city (if available)
-- This ensures unique slugs while keeping them readable
-- Temporarily disable the bookstore_auto_convert trigger to avoid PostGIS errors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bookstore_auto_convert' 
    AND tgrelid = 'bookstores'::regclass
  ) THEN
    ALTER TABLE bookstores DISABLE TRIGGER bookstore_auto_convert;
    RAISE NOTICE 'Disabled bookstore_auto_convert trigger for duplicate handling';
  END IF;
END $$;

WITH duplicates AS (
  SELECT slug, COUNT(*) as count
  FROM bookstores
  WHERE slug IS NOT NULL AND slug != ''
  GROUP BY slug
  HAVING COUNT(*) > 1
)
UPDATE bookstores b
SET slug = generate_slug(
  CASE 
    WHEN b.city IS NOT NULL AND b.city != '' 
    THEN b.name || ' ' || b.city
    ELSE b.name || ' ' || b.id::TEXT
  END
)
FROM duplicates d
WHERE b.slug = d.slug
  AND b.id NOT IN (
    -- Keep the first occurrence (lowest ID) with original slug
    SELECT MIN(id) 
    FROM bookstores 
    WHERE slug = d.slug
  );

-- Re-enable the trigger if it was disabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bookstore_auto_convert' 
    AND tgrelid = 'bookstores'::regclass
    AND NOT tgisinternal
  ) THEN
    ALTER TABLE bookstores ENABLE TRIGGER bookstore_auto_convert;
    RAISE NOTICE 'Re-enabled bookstore_auto_convert trigger';
  END IF;
END $$;

-- Step 7: Verify all bookshops have slugs
-- Run this to check:
-- SELECT COUNT(*) as missing_slugs 
-- FROM bookstores 
-- WHERE slug IS NULL OR slug = '';

-- Step 8: (Optional) Add unique constraint after deduplication
-- Uncomment this after verifying no duplicates remain:
-- ALTER TABLE bookstores 
-- ADD CONSTRAINT unique_slug UNIQUE (slug);

-- Step 9: Create a trigger to auto-generate slugs for new bookshops
CREATE OR REPLACE FUNCTION set_bookstore_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
    
    -- If slug still conflicts, append city or ID
    WHILE EXISTS (SELECT 1 FROM bookstores WHERE slug = NEW.slug AND id != NEW.id) LOOP
      IF NEW.city IS NOT NULL AND NEW.city != '' THEN
        NEW.slug := generate_slug(NEW.name || ' ' || NEW.city);
      ELSE
        NEW.slug := generate_slug(NEW.name || ' ' || NEW.id::TEXT);
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_set_bookstore_slug_insert ON bookstores;
CREATE TRIGGER trigger_set_bookstore_slug_insert
  BEFORE INSERT ON bookstores
  FOR EACH ROW
  EXECUTE FUNCTION set_bookstore_slug();

-- Create trigger for UPDATE (only if slug is being set to NULL/empty)
DROP TRIGGER IF EXISTS trigger_set_bookstore_slug_update ON bookstores;
CREATE TRIGGER trigger_set_bookstore_slug_update
  BEFORE UPDATE ON bookstores
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION set_bookstore_slug();

