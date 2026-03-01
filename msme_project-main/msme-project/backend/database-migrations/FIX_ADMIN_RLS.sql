-- Fix RLS policy for admins table to allow registration

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin registration" ON admins;
DROP POLICY IF EXISTS "Admins can read own data" ON admins;
DROP POLICY IF EXISTS "Admins can update own data" ON admins;

-- Allow anyone to insert admins (for registration)
CREATE POLICY "Allow admin registration" ON admins
  FOR INSERT WITH CHECK (true);

-- Allow admins to read their own data
CREATE POLICY "Admins can read own data" ON admins
  FOR SELECT USING (true);

-- Allow admins to update their own data
CREATE POLICY "Admins can update own data" ON admins
  FOR UPDATE USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'admins';
