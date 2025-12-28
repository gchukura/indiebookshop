-- Verification queries for slug migration
-- Run these after running add-slug-column.sql

-- 1. Check if slug column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookstores' 
  AND column_name = 'slug';

-- 2. Check if index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bookstores' 
  AND indexname = 'idx_bookstores_slug';

-- 3. Count bookshops with and without slugs
SELECT 
  COUNT(*) as total_bookshops,
  COUNT(slug) as bookshops_with_slug,
  COUNT(*) - COUNT(slug) as bookshops_without_slug
FROM bookstores;

-- 4. Sample slugs to verify format
SELECT id, name, slug, city
FROM bookstores
WHERE slug IS NOT NULL
ORDER BY id
LIMIT 20;

-- 5. Check for duplicate slugs
SELECT slug, COUNT(*) as count, array_agg(name ORDER BY id) as names
FROM bookstores
WHERE slug IS NOT NULL AND slug != ''
GROUP BY slug
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- 6. Check for empty or whitespace-only slugs
SELECT id, name, slug
FROM bookstores
WHERE slug IS NULL OR trim(slug) = ''
LIMIT 20;

-- 7. Test slug generation function
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

