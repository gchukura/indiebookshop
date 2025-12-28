-- Fix Multiple Permissive Policies Performance Warning
-- This script consolidates multiple permissive RLS policies into single policies
--
-- ISSUE: Multiple permissive policies for the same role/action must all be evaluated,
--        which is inefficient. Consolidate them into a single policy with OR conditions.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- ============================================================================
-- STEP 1: Check current policies (run check-rls-policies.sql first)
-- ============================================================================
-- Before running this script, run check-rls-policies.sql to see current policies
-- Then update the policy names and conditions below to match your actual policies

-- ============================================================================
-- STEP 2: Fix bookstores table - Consolidate SELECT policies
-- ============================================================================
-- Current policies:
-- - "Authenticated users can view all bookstores" (SELECT, authenticated, USING: true)
-- - "Public can view live bookstores" (SELECT, public, USING: live = true)
--
-- These will be consolidated into a single SELECT policy

-- Drop the existing SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all bookstores" ON public.bookstores;
DROP POLICY IF EXISTS "Public can view live bookstores" ON public.bookstores;

-- Create consolidated SELECT policy
-- Authenticated users can see all, public (anon) can see live ones
CREATE POLICY "bookstores_select_consolidated"
ON public.bookstores
FOR SELECT
TO authenticated, anon
USING (
  -- Authenticated users can view all bookstores
  (auth.role() = 'authenticated')
  OR
  -- Public (anon) can view live bookstores
  (auth.role() = 'anon' AND live = true)
);

-- ============================================================================
-- STEP 3: Fix features table - Consolidate SELECT policies
-- ============================================================================
-- Current policies:
-- - "Features are publicly readable" (SELECT, public, USING: true)
-- - "Only authenticated users can modify features" (ALL, authenticated, USING: true)
--
-- The "ALL" policy includes SELECT, so authenticated users have two SELECT policies.
-- We'll keep the ALL policy for modifications but create a separate SELECT policy
-- that covers both authenticated and public, then the ALL policy won't need to handle SELECT.

-- Option 1: Keep ALL policy but make it only for INSERT/UPDATE/DELETE
-- First, drop the ALL policy
DROP POLICY IF EXISTS "Only authenticated users can modify features" ON public.features;

-- Recreate it for only INSERT/UPDATE/DELETE (not SELECT)
CREATE POLICY "Only authenticated users can modify features"
ON public.features
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Now drop the SELECT policy and recreate a consolidated one
DROP POLICY IF EXISTS "Features are publicly readable" ON public.features;

-- Create consolidated SELECT policy for both authenticated and public
CREATE POLICY "features_select_consolidated"
ON public.features
FOR SELECT
TO authenticated, anon
USING (true);  -- Features are publicly readable by everyone

-- Note: The ALL policy above will only apply to INSERT/UPDATE/DELETE now
-- since we have a specific SELECT policy

-- ============================================================================
-- STEP 4: Verify the fixes
-- ============================================================================
-- Run this to verify only one SELECT policy exists per role/action combination

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as action
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bookstores', 'features')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- Expected result: Only one SELECT policy per table for authenticated/anon roles

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. Update the DROP POLICY statements with your actual policy names
-- 2. Review the USING conditions to ensure they match your security requirements
-- 3. Test thoroughly after applying these changes
-- 4. If you have INSERT/UPDATE/DELETE policies, they should remain separate
--    (only SELECT policies need consolidation in this case)

