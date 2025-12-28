-- Test queries to verify the migration worked correctly
-- Run these in Supabase SQL Editor after the migration

-- 1. Verify slug column exists and has data
SELECT 
  COUNT(*) as total_bookshops,
  COUNT(slug) as bookshops_with_slug,
  COUNT(*) - COUNT(slug) as bookshops_without_slug
FROM bookstores;

-- 2. Check for any remaining duplicate slugs
SELECT slug, COUNT(*) as count, array_agg(name ORDER BY id) as names
FROM bookstores
WHERE slug IS NOT NULL AND slug != ''
GROUP BY slug
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Sample some slugs to verify format
SELECT id, name, slug, city, state
FROM bookstores
WHERE slug IS NOT NULL
ORDER BY id
LIMIT 20;

-- 4. Test slug generation function
SELECT 
  name,
  generate_slug(name) as generated_slug,
  slug as stored_slug,
  CASE 
    WHEN generate_slug(name) = slug THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM bookstores
WHERE slug IS NOT NULL
LIMIT 20;

-- 5. Test a specific bookshop lookup (replace with actual slug from your data)
-- SELECT * FROM bookstores WHERE slug = 'fables-books';

-- 6. Verify unique constraint exists
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'bookstores'::regclass
  AND conname = 'unique_slug';

-- 7. Check triggers are set up
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'bookstores'::regclass
  AND tgname LIKE '%slug%';

