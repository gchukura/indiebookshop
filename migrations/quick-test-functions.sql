-- Quick Test for Fixed Functions
-- Simple tests that can be run quickly to verify functions work

-- ============================================================================
-- Quick Test 1: clean_ai_description
-- ============================================================================
SELECT 
  'clean_ai_description Test' as test_name,
  clean_ai_description(
    'This locally-owned establishment provides readers with access to books. The bookshop also provides space.',
    'Test Shop'
  ) as result;

-- Expected: Should replace "This locally-owned establishment provides readers with access to" with "They offer"
-- Expected: Should replace "The bookshop also provides" with " and"

-- ============================================================================
-- Quick Test 2: Verify search_path is set
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
-- Quick Test 3: Test trigger with a simple insert (if you have permission)
-- ============================================================================
-- Uncomment to test the trigger (creates and deletes a test record)
/*
DO $$
DECLARE
  test_id INTEGER;
BEGIN
  INSERT INTO public.bookstores (
    name, street, city, state, zip, description, live, lat_numeric, lng_numeric
  ) VALUES (
    'Trigger Test ' || random()::text,
    '123 Test', 'Test', 'CA', '12345', 'Test', false, 37.7749, -122.4194
  ) RETURNING id INTO test_id;
  
  -- Check if location was set
  IF EXISTS (SELECT 1 FROM public.bookstores WHERE id = test_id AND location IS NOT NULL) THEN
    RAISE NOTICE '✓ PASS: Trigger set location';
  ELSE
    RAISE WARNING '✗ FAIL: Trigger did not set location';
  END IF;
  
  DELETE FROM public.bookstores WHERE id = test_id;
END $$;
*/



