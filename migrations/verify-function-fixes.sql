-- Verify Function Search Path Fixes
-- Run this after applying fix-function-search-path.sql

-- Check both functions have SET search_path
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ FIXED'
    ELSE '❌ NOT FIXED'
  END as status,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_slug', 'set_bookstore_slug')
ORDER BY p.proname;

-- Expected results:
-- Both functions should show "✅ FIXED" status
-- Both should have "SET search_path TO ''" or "SET search_path = ''" in their definitions

-- Test that functions still work correctly
SELECT 
  'generate_slug test' as test_name,
  generate_slug('Test Bookshop Name!') as result,
  CASE 
    WHEN generate_slug('Test Bookshop Name!') = 'test-bookshop-name' THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- Test trigger function by checking if it can be called (won't actually insert)
-- This just verifies the function definition is valid
SELECT 
  'set_bookstore_slug function exists' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'set_bookstore_slug'
        AND pg_get_functiondef(p.oid) LIKE '%SET search_path%'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

