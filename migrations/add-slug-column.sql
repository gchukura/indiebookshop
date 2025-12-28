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
-- First, let's find and disable all user-defined triggers on bookstores table
DO $$
DECLARE
  trigger_record RECORD;
  disabled_triggers TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Find all non-system triggers on bookstores table
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'bookstores'::regclass
      AND NOT tgisinternal  -- Exclude system triggers
      AND tgenabled = 'O'   -- Only enabled triggers
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE bookstores DISABLE TRIGGER %I', trigger_record.tgname);
      disabled_triggers := array_append(disabled_triggers, trigger_record.tgname);
      RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not disable trigger %: %', trigger_record.tgname, SQLERRM;
    END;
  END LOOP;
  
  -- Store disabled triggers in a temporary table for later re-enabling
  CREATE TEMP TABLE IF NOT EXISTS disabled_bookstore_triggers (tgname TEXT);
  TRUNCATE disabled_bookstore_triggers;
  INSERT INTO disabled_bookstore_triggers SELECT unnest(disabled_triggers);
END $$;

-- Now update slugs (triggers are disabled)
UPDATE bookstores 
SET slug = generate_slug(name)
WHERE slug IS NULL OR slug = '';

-- Re-enable all disabled triggers
DO $$
DECLARE
  trigger_name TEXT;
BEGIN
  FOR trigger_name IN SELECT tgname FROM disabled_bookstore_triggers
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE bookstores ENABLE TRIGGER %I', trigger_name);
      RAISE NOTICE 'Re-enabled trigger: %', trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not re-enable trigger %: %', trigger_name, SQLERRM;
    END;
  END LOOP;
END $$;

DROP TABLE IF EXISTS disabled_bookstore_triggers;

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
-- Disable all user-defined triggers again for this update
DO $$
DECLARE
  trigger_record RECORD;
  disabled_triggers TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'bookstores'::regclass
      AND NOT tgisinternal
      AND tgenabled = 'O'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE bookstores DISABLE TRIGGER %I', trigger_record.tgname);
      disabled_triggers := array_append(disabled_triggers, trigger_record.tgname);
      RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not disable trigger %: %', trigger_record.tgname, SQLERRM;
    END;
  END LOOP;
  
  CREATE TEMP TABLE IF NOT EXISTS disabled_bookstore_triggers (tgname TEXT);
  TRUNCATE disabled_bookstore_triggers;
  INSERT INTO disabled_bookstore_triggers SELECT unnest(disabled_triggers);
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

-- Re-enable all disabled triggers
DO $$
DECLARE
  trigger_name TEXT;
BEGIN
  FOR trigger_name IN SELECT tgname FROM disabled_bookstore_triggers
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE bookstores ENABLE TRIGGER %I', trigger_name);
      RAISE NOTICE 'Re-enabled trigger: %', trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not re-enable trigger %: %', trigger_name, SQLERRM;
    END;
  END LOOP;
END $$;

DROP TABLE IF EXISTS disabled_bookstore_triggers;

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

