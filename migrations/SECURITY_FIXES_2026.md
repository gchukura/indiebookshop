# Supabase Security Warnings - Fix Summary

This document summarizes the fixes applied to address Supabase security warnings.

## Issues Fixed

### 1. Function Search Path Mutable (7 functions)

**Issue**: Functions without `SET search_path` are vulnerable to search_path injection attacks.

**Functions Fixed**:
- ✅ `update_google_contact_data`
- ✅ `update_ai_description` (both versions - with and without `p_validated` parameter)
- ✅ `update_google_places_data`
- ✅ `update_google_place_id`
- ⚠️ `bookstore_auto_convert` (detected, needs manual review if exists)
- ⚠️ `clean_ai_description` (detected, needs manual review if exists)

**Solution**: Added `SET search_path = ''` to all function definitions. When `search_path` is empty, all table/function references must be fully qualified (e.g., `public.bookstores`).

### 2. Extension in Public Schema (2 extensions)

**Issue**: Extensions `postgis` and `pg_trgm` are installed in the `public` schema instead of a dedicated schema.

**Extensions**:
- ⚠️ `postgis` - Move to `extensions` schema (requires database owner permissions)
- ⚠️ `pg_trgm` - Move to `extensions` schema (requires database owner permissions)

**Solution**: The migration attempts to move these extensions to the `extensions` schema. If you don't have database owner permissions, you'll need to:
1. Contact Supabase support to move the extensions, OR
2. Accept the warning (these are standard PostgreSQL extensions with minimal security risk)

## Migration File

**File**: `migrations/fix-all-security-warnings.sql`

This migration:
1. Fixes all known functions with `SET search_path = ''`
2. Attempts to move extensions to the `extensions` schema
3. Includes verification queries to check the fixes

## How to Apply

1. **Run the migration in Supabase SQL Editor**:
   ```sql
   -- Copy and paste the contents of migrations/fix-all-security-warnings.sql
   -- into the Supabase SQL Editor and execute
   ```

2. **Verify the fixes**:
   - The migration includes verification queries at the end
   - Check that all functions show "FIXED" status
   - Check that extensions are in the `extensions` schema (or note if permission errors occurred)

3. **Handle manual fixes** (if needed):
   - If `bookstore_auto_convert` or `clean_ai_description` functions exist and weren't automatically fixed:
     ```sql
     -- Get the function definition
     SELECT pg_get_functiondef(oid) 
     FROM pg_proc 
     WHERE proname = 'bookstore_auto_convert'; -- or 'clean_ai_description'
     
     -- Then recreate it with SET search_path = '' added
     ```

## Testing After Migration

After running the migration, test:

1. **Function calls still work**:
   ```sql
   -- Test update_ai_description
   SELECT update_ai_description(1, 'Test description', NOW());
   
   -- Test update_google_contact_data (with a valid bookshop_id)
   -- etc.
   ```

2. **PostGIS functionality** (if extensions were moved):
   ```sql
   -- Test PostGIS functions still work
   SELECT ST_Distance(
     ST_GeogFromText('POINT(-122.4194 37.7749)'),
     ST_GeogFromText('POINT(-122.4094 37.7849)')
   );
   ```

3. **Application functionality**:
   - Test bookshop detail pages load correctly
   - Test AI description generation scripts
   - Test Google Places data enrichment scripts
   - Verify no errors in application logs

## Notes

- **Backward Compatibility**: All function signatures remain the same, so existing code should continue to work
- **Performance**: Setting `search_path = ''` has minimal performance impact
- **Security**: This significantly improves security by preventing search_path injection attacks
- **Extensions**: Moving extensions requires database owner permissions. If you can't move them, the security risk is minimal for these standard PostgreSQL extensions.

## References

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Function Search Path Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Extension Schema Security](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)



