-- Temporary solution: Disable RLS for authentication tables
-- This allows registration to work. In production, use proper RLS policies with auth.uid()

-- Disable RLS on buyers table
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sellers table
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on drivers table
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('buyers', 'sellers', 'drivers');
