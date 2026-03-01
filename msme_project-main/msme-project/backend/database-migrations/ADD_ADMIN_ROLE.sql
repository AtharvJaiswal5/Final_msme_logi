-- Add admin role support to the users table
-- This allows admin users to access the analytics dashboard

-- First, check if the role column has a constraint
-- If it does, we need to modify it to include 'admin'

-- For PostgreSQL, we need to alter the check constraint or enum type
-- Assuming role is a text column with a check constraint:

-- Drop the existing check constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new check constraint that includes admin
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('buyer', 'seller', 'driver', 'admin'));

-- If you're using an ENUM type instead, use this:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Create an admin user (change the email and password as needed)
-- Password: admin123 (you should change this!)
INSERT INTO users (id, name, email, phone, role, password_hash)
VALUES (
  gen_random_uuid(),
  'Admin User',
  'admin@msme.com',
  '1234567890',
  'admin',
  '$2b$10$YourHashedPasswordHere' -- You'll need to hash this properly
)
ON CONFLICT (email) DO NOTHING;

-- Verify the admin user was created
SELECT id, name, email, role FROM users WHERE role = 'admin';
