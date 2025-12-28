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
-- STEP 2: Fix bookstores table - Consolidate SELECT policies for authenticated role
-- ============================================================================
-- Based on the warning, bookstores has:
-- - "Authenticated users can view all bookstores"
-- - "Public can view live bookstores"
--
-- These should be consolidated into a single policy

-- First, drop the existing permissive policies (update names based on check-rls-policies.sql results)
-- NOTE: Update these policy names to match your actual policy names!

-- Drop old policies (uncomment and update policy names after checking)
-- DROP POLICY IF EXISTS "Authenticated users can view all bookstores" ON public.bookstores;
-- DROP POLICY IF EXISTS "Public can view live bookstores" ON public.bookstores;

-- Create consolidated SELECT policy for authenticated users
-- This combines both conditions: authenticated users can see all, or public can see live ones
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
-- STEP 3: Fix features table - Consolidate SELECT policies for authenticated role
-- ============================================================================
-- Based on the warning, features has:
-- - "Features are publicly readable"
-- - "Only authenticated users can modify features"
--
-- The SELECT policies should be consolidated

-- Drop old policies (uncomment and update policy names after checking)
-- DROP POLICY IF EXISTS "Features are publicly readable" ON public.features;
-- DROP POLICY IF EXISTS "Only authenticated users can modify features" ON public.features;

-- Create consolidated SELECT policy
-- Since features are publicly readable, this is simple
CREATE POLICY "features_select_consolidated"
ON public.features
FOR SELECT
TO authenticated, anon
USING (true);  -- Features are publicly readable by everyone

-- If there are INSERT/UPDATE/DELETE policies, keep them separate (they're for different actions)
-- Only consolidate policies for the SAME action (SELECT in this case)

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

