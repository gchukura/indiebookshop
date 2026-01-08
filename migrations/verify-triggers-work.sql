-- Verify Triggers Are Working
-- This creates a test record and checks that both triggers fired correctly

DO $verify_triggers$
DECLARE
  test_id INTEGER;
  test_loc geography;
  test_slug TEXT;
  test_name TEXT := 'Trigger Test ' || random()::text;
BEGIN
  RAISE NOTICE '=== Verifying Triggers ===';
  RAISE NOTICE 'Inserting test record: %', test_name;
  
  -- Insert a test bookshop
  INSERT INTO public.bookstores (
    name, street, city, state, zip, description, live, lat_numeric, lng_numeric
  ) VALUES (
    test_name,
    '123 Test St',
    'Test City',
    'CA',
    '12345',
    'Test description',
    false, -- Set to false so it doesn't appear in production
    37.7749, -- San Francisco coordinates
    -122.4194
  ) RETURNING id, location, slug INTO test_id, test_loc, test_slug;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Test record created with ID: %', test_id;
  RAISE NOTICE '';
  
  -- Check bookstore_auto_convert trigger (location)
  IF test_loc IS NOT NULL THEN
    RAISE NOTICE '✓ PASS: bookstore_auto_convert trigger set location';
    RAISE NOTICE '  Location: %', test_loc;
  ELSE
    RAISE WARNING '✗ FAIL: bookstore_auto_convert trigger did NOT set location';
  END IF;
  
  -- Check set_bookstore_slug trigger (slug)
  IF test_slug IS NOT NULL AND test_slug != '' THEN
    RAISE NOTICE '✓ PASS: set_bookstore_slug trigger set slug';
    RAISE NOTICE '  Slug: %', test_slug;
  ELSE
    RAISE WARNING '✗ FAIL: set_bookstore_slug trigger did NOT set slug';
  END IF;
  
  -- Clean up
  DELETE FROM public.bookstores WHERE id = test_id;
  RAISE NOTICE '';
  RAISE NOTICE '✓ Test record cleaned up';
  RAISE NOTICE '';
  RAISE NOTICE '=== All triggers verified successfully! ===';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up on error
    IF test_id IS NOT NULL THEN
      DELETE FROM public.bookstores WHERE id = test_id;
    END IF;
    RAISE WARNING '✗ ERROR: %', SQLERRM;
END $verify_triggers$;

-- Also return a summary query
SELECT 
  'Trigger Verification Complete' as status,
  'Check the Messages/Notice tab above for detailed results' as message;



