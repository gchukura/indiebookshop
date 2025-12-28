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

-- Get full policy definitions (using pg_policy directly for expressions)
SELECT 
  n.nspname as schemaname,
  c.relname as tablename,
  pol.polname as policyname,
  CASE pol.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as permissive,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as cmd,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression,
  array_to_string(
    ARRAY(
      SELECT pg_get_userbyid(role)
      FROM unnest(pol.polroles) AS role
    ),
    ', '
  ) as roles
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('bookstores', 'features')
ORDER BY c.relname, pol.polname;

