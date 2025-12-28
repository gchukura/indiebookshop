# Performance Warnings - Resolution Guide

This document addresses performance warnings from Supabase's database linter related to multiple permissive RLS policies.

## Warning Summary

**Multiple Permissive Policies** (2 warnings) - ⚠️ **FIXABLE**

1. `public.bookstores` table - Multiple SELECT policies for `authenticated` role
2. `public.features` table - Multiple SELECT policies for `authenticated` role

---

## Understanding the Issue

### What are Permissive Policies?

In PostgreSQL Row Level Security (RLS), there are two types of policies:
- **Permissive**: Allows access if the condition is true (uses OR logic)
- **Restrictive**: Denies access if the condition is false (uses AND logic)

### The Performance Problem

When multiple **permissive** policies exist for the same role and action (e.g., SELECT), PostgreSQL must evaluate **ALL** of them for every query:

```sql
-- BAD: Multiple permissive policies
Policy 1: authenticated users can view all bookstores
Policy 2: public can view live bookstores

-- For each query, PostgreSQL checks BOTH policies
-- Result: authenticated OR public → inefficient
```

### The Solution

Consolidate multiple permissive policies into a **single policy** with OR conditions:

```sql
-- GOOD: Single consolidated policy
Policy: authenticated users can view all OR public can view live
USING (
  (auth.role() = 'authenticated')
  OR
  (auth.role() = 'anon' AND live = true)
)
```

---

## Current Policies (Based on Warnings)

### bookstores Table

**Multiple SELECT policies for `authenticated` role:**
- "Authenticated users can view all bookstores"
- "Public can view live bookstores"

**Solution:**
Consolidate into a single SELECT policy that handles both cases.

### features Table

**Multiple SELECT policies for `authenticated` role:**
- "Features are publicly readable"
- "Only authenticated users can modify features" (this might be for INSERT/UPDATE/DELETE, not SELECT)

**Solution:**
If both are SELECT policies, consolidate. If one is for modifications, keep it separate.

---

## Fix Process

### Step 1: Check Current Policies

Run `migrations/check-rls-policies.sql` to see:
- What policies currently exist
- Their exact names
- Their USING conditions
- Which roles they apply to

### Step 2: Review Security Requirements

Before consolidating, ensure you understand:
- What access each policy currently provides
- Whether consolidation maintains the same security level
- If any policies are for different actions (INSERT/UPDATE/DELETE) - these should stay separate

### Step 3: Apply Fix

Run `migrations/fix-multiple-permissive-policies.sql`:

1. **Update the script** with your actual policy names (from Step 1)
2. **Review the USING conditions** to ensure they match your requirements
3. **Drop old policies** (after verifying names)
4. **Create consolidated policies**

### Step 4: Verify

After applying the fix:
- Run the verification query in the fix script
- Test that queries still work correctly
- Verify security is maintained

---

## Example Fix

### Before (Inefficient)

```sql
-- Policy 1
CREATE POLICY "authenticated_view_all"
ON bookstores FOR SELECT
TO authenticated
USING (true);

-- Policy 2
CREATE POLICY "public_view_live"
ON bookstores FOR SELECT
TO anon
USING (live = true);
```

**Problem:** If a user is `authenticated`, PostgreSQL still checks both policies.

### After (Efficient)

```sql
-- Consolidated policy
CREATE POLICY "bookstores_select_consolidated"
ON bookstores FOR SELECT
TO authenticated, anon
USING (
  (auth.role() = 'authenticated')
  OR
  (auth.role() = 'anon' AND live = true)
);
```

**Benefit:** Only one policy is evaluated per query.

---

## Important Notes

1. **Only consolidate policies for the SAME action**
   - SELECT policies → consolidate SELECT policies
   - INSERT policies → keep separate (different action)
   - UPDATE policies → keep separate (different action)

2. **Maintain security**
   - Ensure consolidated policy provides same access as original policies
   - Test thoroughly after changes

3. **Policy names**
   - Update DROP POLICY statements with actual policy names
   - Use descriptive names for consolidated policies

4. **Testing**
   - Test with authenticated users
   - Test with anonymous users
   - Verify queries still work correctly
   - Check performance improvement

---

## Performance Impact

**Before:** Each query evaluates 2+ policies
**After:** Each query evaluates 1 policy

**Expected improvement:**
- Faster query execution
- Reduced CPU usage
- Better scalability

---

## References

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Multiple Permissive Policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

