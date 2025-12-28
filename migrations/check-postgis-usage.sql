-- Check if PostGIS extension is installed and if it's being used
-- Run this in Supabase SQL Editor

-- 1. Check if PostGIS extension is installed
SELECT 
  extname as extension_name,
  extversion as version,
  nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'postgis';

-- 2. Check for any geography/geometry columns in your tables
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE (data_type LIKE '%geography%' OR data_type LIKE '%geometry%' OR udt_name LIKE '%geography%' OR udt_name LIKE '%geometry%')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 3. Check for any functions using PostGIS (ST_ functions)
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE 'st_%'
  AND n.nspname = 'public'
LIMIT 10;

-- 4. Check for triggers using PostGIS functions
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE pg_get_triggerdef(oid) LIKE '%ST_%'
  OR pg_get_triggerdef(oid) LIKE '%geography%'
  OR pg_get_triggerdef(oid) LIKE '%geometry%';

