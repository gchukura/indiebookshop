-- Check Current RLS Policies
-- Run this to see what policies exist before consolidating them

-- Check RLS policies on bookstores table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'bookstores'
ORDER BY policyname;

-- Check RLS policies on features table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'features'
ORDER BY policyname;

-- Check if RLS is enabled on these tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('bookstores', 'features');

-- Get full policy definitions
SELECT 
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  pg_get_expr(p.qual, p.polrelid) as using_expression,
  pg_get_expr(p.with_check, p.polrelid) as with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN ('bookstores', 'features')
ORDER BY p.tablename, p.policyname;

