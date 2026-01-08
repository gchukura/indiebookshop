-- Test Script for Fixed Functions
-- Run this in Supabase SQL Editor to verify the fixed functions work correctly
-- 
-- Tests:
-- 1. bookstore_auto_convert trigger function
-- 2. clean_ai_description function

-- ============================================================================
-- TEST 1: bookstore_auto_convert Trigger Function
-- ============================================================================
-- This trigger should automatically convert lat_numeric/lng_numeric to geography location

DO $test1$
DECLARE
  test_bookshop_id INTEGER;
  test_location geography;
  test_lat NUMERIC := 37.7749;  -- San Francisco coordinates
  test_lng NUMERIC := -122.4194;
BEGIN
  RAISE NOTICE '=== TEST 1: bookstore_auto_convert Trigger ===';
  
  -- Insert a test bookshop with lat_numeric and lng_numeric
  -- The trigger should automatically populate the location field
  INSERT INTO public.bookstores (
    name,
    street,
    city,
    state,
    zip,
    description,
    live,
    lat_numeric,
    lng_numeric
  ) VALUES (
    'Test Bookshop ' || random()::text,
    '123 Test St',
    'Test City',
    'CA',
    '12345',
    'Test description for trigger testing',
    false, -- Set to false so it doesn't appear in production
    test_lat,
    test_lng
  )
  RETURNING id, location INTO test_bookshop_id, test_location;
  
  -- Check if location was populated
  IF test_location IS NOT NULL THEN
    RAISE NOTICE '✓ PASS: Trigger successfully created geography location';
    RAISE NOTICE '  Location: %', test_location;
    
    -- Verify the location is correct by checking coordinates
    -- Use fully qualified PostGIS functions since search_path is empty
    IF public.ST_X(test_location::geometry) BETWEEN test_lng - 0.0001 AND test_lng + 0.0001 AND
       public.ST_Y(test_location::geometry) BETWEEN test_lat - 0.0001 AND test_lat + 0.0001 THEN
      RAISE NOTICE '✓ PASS: Location coordinates are correct';
    ELSE
      RAISE WARNING '✗ FAIL: Location coordinates do not match input';
    END IF;
  ELSE
    RAISE WARNING '✗ FAIL: Trigger did not populate location field';
  END IF;
  
  -- Clean up test record
  DELETE FROM public.bookstores WHERE id = test_bookshop_id;
  RAISE NOTICE '  Test record cleaned up';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up on error
    IF test_bookshop_id IS NOT NULL THEN
      DELETE FROM public.bookstores WHERE id = test_bookshop_id;
    END IF;
    RAISE WARNING '✗ ERROR in trigger test: %', SQLERRM;
END $test1$;

-- ============================================================================
-- TEST 2: clean_ai_description Function
-- ============================================================================
-- Test various scenarios for the description cleaning function

DO $test2$
DECLARE
  test_result TEXT;
  test_description TEXT;
  test_name TEXT := 'Test Bookshop';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: clean_ai_description Function ===';
  
  -- Test 2a: Basic cleaning - remove formulaic phrases
  test_description := 'This locally-owned establishment provides readers with access to a curated selection of books. The bookshop also provides a cozy reading space.';
  test_result := clean_ai_description(test_description, test_name);
  
  RAISE NOTICE 'Test 2a: Basic cleaning';
  RAISE NOTICE '  Input: %', test_description;
  RAISE NOTICE '  Output: %', test_result;
  
  IF test_result LIKE '%They offer%' AND test_result NOT LIKE '%This locally-owned establishment%' THEN
    RAISE NOTICE '✓ PASS: Formulaic phrases removed correctly';
  ELSE
    RAISE WARNING '✗ FAIL: Formulaic phrases not removed correctly';
  END IF;
  
  -- Test 2b: Long description truncation
  test_description := 'This is the first sentence. This is the second sentence. This is a very long third sentence that should be truncated if the total length exceeds 300 characters because we want to keep descriptions concise and readable for users browsing the website.';
  test_result := clean_ai_description(test_description, test_name);
  
  RAISE NOTICE '';
  RAISE NOTICE 'Test 2b: Long description truncation';
  RAISE NOTICE '  Input length: %', LENGTH(test_description);
  RAISE NOTICE '  Output length: %', LENGTH(test_result);
  RAISE NOTICE '  Output: %', test_result;
  
  IF LENGTH(test_result) <= 300 THEN
    RAISE NOTICE '✓ PASS: Long description truncated correctly';
  ELSE
    RAISE WARNING '✗ FAIL: Long description not truncated (length: %)', LENGTH(test_result);
  END IF;
  
  -- Test 2c: Multi-paragraph description (should take first paragraph only)
  test_description := 'This is the first paragraph with important information about the bookshop.' || E'\n\n' || 'This is the second paragraph that should be removed.';
  test_result := clean_ai_description(test_description, test_name);
  
  RAISE NOTICE '';
  RAISE NOTICE 'Test 2c: Multi-paragraph (first paragraph only)';
  RAISE NOTICE '  Input: %', test_description;
  RAISE NOTICE '  Output: %', test_result;
  
  IF test_result NOT LIKE '%second paragraph%' THEN
    RAISE NOTICE '✓ PASS: Only first paragraph extracted';
  ELSE
    RAISE WARNING '✗ FAIL: Second paragraph not removed';
  END IF;
  
  -- Test 2d: Short description (should remain unchanged)
  test_description := 'A cozy independent bookstore.';
  test_result := clean_ai_description(test_description, test_name);
  
  RAISE NOTICE '';
  RAISE NOTICE 'Test 2d: Short description (unchanged)';
  RAISE NOTICE '  Input: %', test_description;
  RAISE NOTICE '  Output: %', test_result;
  
  IF test_result = test_description OR test_result = TRIM(test_description) THEN
    RAISE NOTICE '✓ PASS: Short description preserved';
  ELSE
    RAISE WARNING '✗ FAIL: Short description modified unexpectedly';
  END IF;
  
  -- Test 2e: Empty/null handling
  BEGIN
    test_result := clean_ai_description('', test_name);
    RAISE NOTICE '';
    RAISE NOTICE 'Test 2e: Empty string handling';
    RAISE NOTICE '  Output: %', test_result;
    RAISE NOTICE '✓ PASS: Empty string handled without error';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '✗ FAIL: Empty string caused error: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== All clean_ai_description tests completed ===';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '✗ ERROR in clean_ai_description test: %', SQLERRM;
END $test2$;

-- ============================================================================
-- TEST 3: Verify search_path is set correctly
-- ============================================================================

DO $test3$
DECLARE
  func_count INTEGER;
  fixed_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Verify search_path Settings ===';
  
  -- Count functions that should have search_path set
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('bookstore_auto_convert', 'clean_ai_description');
  
  -- Count functions that actually have search_path set
  SELECT COUNT(*) INTO fixed_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('bookstore_auto_convert', 'clean_ai_description')
    AND pg_get_functiondef(p.oid) LIKE '%SET search_path%';
  
  RAISE NOTICE '  Functions checked: %', func_count;
  RAISE NOTICE '  Functions with search_path set: %', fixed_count;
  
  IF func_count = fixed_count AND func_count = 2 THEN
    RAISE NOTICE '✓ PASS: All functions have search_path set correctly';
  ELSE
    RAISE WARNING '✗ FAIL: Not all functions have search_path set (expected: %, found: %)', func_count, fixed_count;
  END IF;
  
END $test3$;

-- ============================================================================
-- Summary Report
-- ============================================================================

SELECT 
  'Test Summary' as summary,
  'All tests completed. Check the NOTICE messages above for results.' as message;

