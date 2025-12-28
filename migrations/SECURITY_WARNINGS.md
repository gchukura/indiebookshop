# Supabase Security Warnings - Resolution Guide

This document addresses security warnings from Supabase's database linter.

## Warnings Summary

1. **Function Search Path Mutable** (2 warnings) - ✅ **FIXABLE**
2. **Extension in Public Schema** (2 warnings) - ⚠️ **REQUIRES OWNER PERMISSIONS**

---

## 1. Function Search Path Mutable

### Issue
Functions `generate_slug` and `set_bookstore_slug` don't have a fixed `search_path`, making them vulnerable to search_path injection attacks.

### Security Risk
**MEDIUM** - An attacker could potentially manipulate the search_path to execute malicious code.

### Solution
✅ **FIXED** - Run `migrations/fix-function-search-path.sql` to add `SET search_path = ''` to both functions.

### Implementation
The fix:
- Adds `SET search_path = ''` to both functions
- Uses fully qualified table names (`public.bookstores`) since search_path is empty
- Maintains all existing functionality

### Verification
After running the fix, verify with:
```sql
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_slug', 'set_bookstore_slug');
```

Both functions should show `SET search_path = ''` in their definitions.

---

## 2. Extension in Public Schema

### Issue
Extensions `postgis` and `pg_trgm` are installed in the `public` schema instead of a dedicated schema.

### Security Risk
**LOW** - Extensions in public schema can be accessed by any user, but these are standard PostgreSQL extensions.

### Solution
⚠️ **REQUIRES DATABASE OWNER PERMISSIONS**

Since you're not the database owner, you have two options:

#### Option A: Contact Supabase Support (Recommended)
1. Open a support ticket
2. Request to move extensions to a dedicated schema:
   ```sql
   -- Create dedicated schema for extensions
   CREATE SCHEMA IF NOT EXISTS extensions;
   
   -- Move postgis extension
   ALTER EXTENSION postgis SET SCHEMA extensions;
   
   -- Move pg_trgm extension
   ALTER EXTENSION pg_trgm SET SCHEMA extensions;
   ```

3. **Important**: After moving extensions, you may need to:
   - Update function search_paths to include the extensions schema
   - Update any queries that reference extension functions
   - Test all PostGIS functionality

#### Option B: Accept the Warning
- These are standard PostgreSQL extensions
- The security risk is minimal
- Many Supabase projects have extensions in public schema
- Document this decision for compliance

### Why Extensions Should Be in Separate Schema
- Better security isolation
- Clearer separation of concerns
- Easier to manage permissions
- Follows PostgreSQL best practices

### Current Extensions
- **postgis**: Required for geography columns (`bookstores.location`)
- **pg_trgm**: Used for text similarity/trigram matching (if used)

---

## Priority

1. **HIGH**: Fix function search_path issues (run `fix-function-search-path.sql`)
2. **LOW**: Address extension schema warnings (contact support or accept)

---

## Testing After Fixes

After running `fix-function-search-path.sql`, test:

1. **Slug Generation**:
   ```sql
   SELECT generate_slug('Test Bookshop Name!');
   -- Should return: test-bookshop-name
   ```

2. **Trigger Function**:
   ```sql
   -- Insert a test bookshop (should auto-generate slug)
   INSERT INTO bookstores (name, city, state, live) 
   VALUES ('Test Bookshop ' || random()::text, 'Test City', 'CA', true)
   RETURNING id, name, slug;
   
   -- Clean up
   DELETE FROM bookstores WHERE name LIKE 'Test Bookshop%';
   ```

3. **Verify No Errors**:
   - Check Vercel function logs for any database errors
   - Test bookshop detail pages load correctly
   - Verify sitemap generation works

---

## References

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Function Search Path Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Extension Schema Security](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- [PostgreSQL Search Path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)

