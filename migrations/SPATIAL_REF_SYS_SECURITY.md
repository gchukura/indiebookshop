# spatial_ref_sys Security Warning - Resolution Guide

## Problem
Supabase is flagging the `spatial_ref_sys` table as a security issue because it's public and unrestricted.

## Root Cause
The `spatial_ref_sys` table is a **system table** required by the PostGIS extension. It contains Spatial Reference System (SRID) definitions - essentially a catalog of coordinate systems (like WGS84, UTM zones, etc.).

## Is PostGIS Being Used?
**YES** - Your database has PostGIS geography columns:
- `public.bookstores.location` (geography type)
- `public.bookstores_clean.location` (geography type)

These columns are likely populated by triggers (e.g., `bookstore_auto_convert_trigger`) that convert `latitude`/`longitude` text fields into PostGIS geography points.

## Can We Remove spatial_ref_sys?
**NO** - The `spatial_ref_sys` table is required for PostGIS to function. Removing it will break:
- Any queries using geography/geometry columns
- PostGIS functions (ST_Distance, ST_Within, etc.)
- Triggers that populate geography columns

## Security Assessment
**Risk Level: LOW**
- The table contains only reference data (SRID definitions)
- It does NOT contain user data or sensitive information
- It's read-only reference data used by PostGIS internally
- The security warning is a **false positive** for this use case

## Solutions

### Option 1: Contact Supabase Support (Recommended)
Since you're not the database owner and cannot change permissions:

1. **Open a support ticket** with Supabase
2. **Explain the situation:**
   - PostGIS extension is installed and required
   - `spatial_ref_sys` is a system table required by PostGIS
   - The table contains only reference data (SRID definitions), not user data
   - You cannot modify permissions as you're not the owner
   - Request they either:
     - Mark this as a false positive for PostGIS installations
     - Or provide guidance on how to restrict access without breaking PostGIS

3. **Reference this documentation:**
   - PostGIS documentation: https://postgis.net/documentation/
   - `spatial_ref_sys` is a standard PostGIS system table

### Option 2: Accept the Warning (If Support Can't Help)
If Supabase support cannot resolve this:
- The security risk is minimal (reference data only)
- The warning can be safely ignored
- Document this decision for future reference

### Option 3: Remove PostGIS (NOT RECOMMENDED)
Only consider this if:
- You're not using geography columns for queries
- You can convert all geography data to text latitude/longitude
- You're willing to lose spatial query capabilities

**Steps (if you must):**
1. Convert all `geography` columns to `TEXT` (store as lat/lng strings)
2. Drop all PostGIS-dependent triggers
3. Drop the PostGIS extension
4. This will remove `spatial_ref_sys` but you'll lose spatial capabilities

## Verification Queries

Run these to confirm PostGIS usage:

```sql
-- Check for geography/geometry columns
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE (data_type LIKE '%geography%' OR data_type LIKE '%geometry%' 
       OR udt_name LIKE '%geography%' OR udt_name LIKE '%geometry%')
  AND table_schema = 'public';

-- Check for PostGIS functions in use
SELECT 
  n.nspname as schema,
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE 'st_%'
  AND n.nspname = 'public'
LIMIT 10;
```

## Recommendation
**Contact Supabase support** to explain that `spatial_ref_sys` is a required PostGIS system table and request they either:
1. Mark it as a false positive for PostGIS installations, OR
2. Provide guidance on restricting access without breaking PostGIS functionality

The security risk is minimal since it's only reference data, but it's best to get official guidance from Supabase.

