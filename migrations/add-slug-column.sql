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
  
  -- Now update slugs (triggers are disabled)
  UPDATE bookstores 
  SET slug = generate_slug(name)
  WHERE slug IS NULL OR slug = '';
  
  -- Re-enable all disabled triggers
  FOR trigger_name IN 
    SELECT unnest(disabled_triggers)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE bookstores ENABLE TRIGGER %I', trigger_name);
      RAISE NOTICE 'Re-enabled trigger: %', trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not re-enable trigger %: %', trigger_name, SQLERRM;
    END;
  END LOOP;
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
-- We'll iterate until all duplicates are resolved
DO $$
DECLARE
  trigger_record RECORD;
  disabled_triggers TEXT[] := ARRAY[]::TEXT[];
  duplicate_count INTEGER;
  iteration_count INTEGER := 0;
  max_iterations INTEGER := 10; -- Safety limit
BEGIN
  -- Disable all user-defined triggers
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
  
  -- Iteratively resolve duplicates until none remain
  LOOP
    iteration_count := iteration_count + 1;
    
    -- Count remaining duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
      SELECT slug, COUNT(*) as cnt
      FROM bookstores
      WHERE slug IS NOT NULL AND slug != ''
      GROUP BY slug
      HAVING COUNT(*) > 1
    ) dup_check;
    
    EXIT WHEN duplicate_count = 0 OR iteration_count > max_iterations;
    
    RAISE NOTICE 'Iteration %: Found % duplicate slug groups', iteration_count, duplicate_count;
    
    -- Update duplicates: append city, then state, then ID if still duplicate
    -- Use ROW_NUMBER to ensure each duplicate gets a unique suffix
    WITH duplicates AS (
      SELECT slug, COUNT(*) as count
      FROM bookstores
      WHERE slug IS NOT NULL AND slug != ''
      GROUP BY slug
      HAVING COUNT(*) > 1
    ),
    to_update AS (
      SELECT 
        b.id, 
        b.name, 
        b.city, 
        b.state, 
        d.slug,
        ROW_NUMBER() OVER (PARTITION BY d.slug ORDER BY b.id) as rn,
        -- Check if name+city combination is also duplicate
        generate_slug(b.name || COALESCE(' ' || b.city, '')) as name_city_slug,
        generate_slug(b.name || COALESCE(' ' || b.state, '')) as name_state_slug
      FROM bookstores b
      JOIN duplicates d ON b.slug = d.slug
      WHERE b.id NOT IN (
        -- Keep the first occurrence (lowest ID) with original slug
        SELECT MIN(id) 
        FROM bookstores 
        WHERE slug = d.slug
      )
    ),
    slug_usage AS (
      -- Check which slugs are already in use
      SELECT slug, COUNT(*) as usage_count
      FROM bookstores
      WHERE slug IS NOT NULL AND slug != ''
      GROUP BY slug
    )
    UPDATE bookstores b
    SET slug = generate_slug(
      CASE 
        -- Strategy 1: name + city (if city exists and the resulting slug is unique)
        WHEN tu.city IS NOT NULL AND tu.city != '' 
          AND NOT EXISTS (
            SELECT 1 FROM slug_usage su 
            WHERE su.slug = tu.name_city_slug 
            AND su.usage_count > 0
          )
        THEN tu.name || ' ' || tu.city
        -- Strategy 2: name + state (if state exists and the resulting slug is unique)
        WHEN tu.state IS NOT NULL AND tu.state != ''
          AND NOT EXISTS (
            SELECT 1 FROM slug_usage su 
            WHERE su.slug = tu.name_state_slug 
            AND su.usage_count > 0
          )
        THEN tu.name || ' ' || tu.state
        -- Strategy 3: name + city + ID (if city exists)
        WHEN tu.city IS NOT NULL AND tu.city != ''
        THEN tu.name || ' ' || tu.city || ' ' || b.id::TEXT
        -- Strategy 4: name + state + ID (if state exists)
        WHEN tu.state IS NOT NULL AND tu.state != ''
        THEN tu.name || ' ' || tu.state || ' ' || b.id::TEXT
        -- Last resort: name + ID
        ELSE tu.name || ' ' || b.id::TEXT
      END
    )
    FROM to_update tu
    WHERE b.id = tu.id;
    
    RAISE NOTICE 'Updated duplicates in iteration %', iteration_count;
  END LOOP;
  
  -- Check final duplicate count
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT slug, COUNT(*) as cnt
    FROM bookstores
    WHERE slug IS NOT NULL AND slug != ''
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) final_check;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still have % duplicate slug groups after % iterations. Manual review needed.', duplicate_count, iteration_count;
  ELSE
    RAISE NOTICE 'All duplicates resolved after % iterations', iteration_count;
  END IF;
  
  -- Re-enable all disabled triggers
  FOR trigger_name IN 
    SELECT unnest(disabled_triggers)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE bookstores ENABLE TRIGGER %I', trigger_name);
      RAISE NOTICE 'Re-enabled trigger: %', trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not re-enable trigger %: %', trigger_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 7: Verify all bookshops have slugs
-- Run this to check:
-- SELECT COUNT(*) as missing_slugs 
-- FROM bookstores 
-- WHERE slug IS NULL OR slug = '';

-- Step 8: Add unique constraint after deduplication
-- First check if duplicates still exist
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count remaining duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT slug, COUNT(*) as cnt
    FROM bookstores
    WHERE slug IS NOT NULL AND slug != ''
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) dup_check;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Cannot add unique constraint: % duplicate slug groups still exist. Run this query to see them:', duplicate_count;
    RAISE NOTICE 'SELECT slug, COUNT(*) as count, array_agg(name ORDER BY id) as names FROM bookstores WHERE slug IS NOT NULL AND slug != '' GROUP BY slug HAVING COUNT(*) > 1 ORDER BY count DESC;';
    RAISE EXCEPTION 'Please resolve all duplicate slugs before adding unique constraint';
  ELSE
    -- Add unique constraint only if no duplicates exist
    BEGIN
      ALTER TABLE bookstores 
      ADD CONSTRAINT unique_slug UNIQUE (slug);
      RAISE NOTICE 'Successfully added unique constraint on slug column';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Unique constraint already exists';
    WHEN OTHERS THEN
      RAISE WARNING 'Could not add unique constraint: %', SQLERRM;
    END;
  END IF;
END $$;

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

