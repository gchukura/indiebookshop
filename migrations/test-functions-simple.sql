-- Simple Test Script for Fixed Functions
-- Run each test block separately if needed

-- ============================================================================
-- TEST 1: clean_ai_description - Basic Test
-- ============================================================================
SELECT 
  'Test 1: clean_ai_description' as test_name,
  clean_ai_description(
    'This locally-owned establishment provides readers with access to books. The bookshop also provides space.',
    'Test Shop'
  ) as result;

-- ============================================================================
-- TEST 2: clean_ai_description - Long Description
-- ============================================================================
SELECT 
  'Test 2: Long description truncation' as test_name,
  LENGTH(clean_ai_description(
    'This is the first sentence. This is the second sentence. This is a very long third sentence that should be truncated if the total length exceeds 300 characters because we want to keep descriptions concise and readable for users browsing the website.',
    'Test Shop'
  )) as result_length;

-- ============================================================================
-- TEST 3: Verify search_path Settings
-- ============================================================================
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✓ FIXED'
    ELSE '✗ NEEDS FIX'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('bookstore_auto_convert', 'clean_ai_description')
ORDER BY p.proname;

-- ============================================================================
-- TEST 4: Trigger Test (Run separately if needed)
-- ============================================================================
-- This test inserts a record to verify both triggers work:
-- 1. bookstore_auto_convert (sets location from lat/lng)
-- 2. set_bookstore_slug (sets slug from name)
-- 
-- NOTE: If you get an error about generate_slug, run migrations/fix-set-bookstore-slug.sql first

DO $trigger_test$
DECLARE
  test_id INTEGER;
  test_loc geography;
  test_slug TEXT;
BEGIN
  INSERT INTO public.bookstores (
    name, street, city, state, zip, description, live, lat_numeric, lng_numeric
  ) VALUES (
    'Trigger Test ' || random()::text,
    '123 Test', 'Test', 'CA', '12345', 'Test', false, 37.7749, -122.4194
  ) RETURNING id, location, slug INTO test_id, test_loc, test_slug;
  
  -- Check location (bookstore_auto_convert trigger)
  IF test_loc IS NOT NULL THEN
    RAISE NOTICE '✓ PASS: bookstore_auto_convert trigger set location';
  ELSE
    RAISE WARNING '✗ FAIL: bookstore_auto_convert trigger did not set location';
  END IF;
  
  -- Check slug (set_bookstore_slug trigger)
  IF test_slug IS NOT NULL AND test_slug != '' THEN
    RAISE NOTICE '✓ PASS: set_bookstore_slug trigger set slug: %', test_slug;
  ELSE
    RAISE WARNING '✗ FAIL: set_bookstore_slug trigger did not set slug';
  END IF;
  
  DELETE FROM public.bookstores WHERE id = test_id;
  RAISE NOTICE 'Test record cleaned up';
END $trigger_test$;

