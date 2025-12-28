-- WARNING: Only run this if PostGIS is confirmed NOT being used
-- This will remove the PostGIS extension and all its tables (including spatial_ref_sys)
-- Run the check-postgis-usage.sql first to verify PostGIS is not needed
--
-- ⚠️ CRITICAL: If your database has geography/geometry columns (like bookstores.location),
-- DO NOT run this script. It will break your database.
--
-- If PostGIS IS being used:
-- - The spatial_ref_sys table is REQUIRED and cannot be removed
-- - The security warning is a false positive (it's reference data, not user data)
-- - Contact Supabase support if you need help addressing the security warning

-- Step 1: Verify PostGIS is not being used (run check-postgis-usage.sql first)
-- If any results are returned, DO NOT proceed with dropping the extension

-- Step 2: Drop PostGIS extension (this will remove spatial_ref_sys table)
-- NOTE: You may need superuser/owner permissions to do this
-- If you get a permission error, contact Supabase support or your database owner

DROP EXTENSION IF EXISTS postgis CASCADE;

-- Step 3: Verify the table is gone
SELECT COUNT(*) as spatial_ref_sys_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'spatial_ref_sys';

-- Expected result: 0 (table should be gone)

