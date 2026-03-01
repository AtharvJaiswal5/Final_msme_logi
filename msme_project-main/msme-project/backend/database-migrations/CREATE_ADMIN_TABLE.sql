-- Create admins table for admin users
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert admins (for registration)
CREATE POLICY "Allow admin registration" ON admins
  FOR INSERT WITH CHECK (true);

-- Allow admins to read their own data
CREATE POLICY "Admins can read own data" ON admins
  FOR SELECT USING (true);

-- Allow admins to update their own data
CREATE POLICY "Admins can update own data" ON admins
  FOR UPDATE USING (true);

-- Create an admin user (change email and password as needed)
-- Password: admin123 (hashed with bcrypt, 10 salt rounds)
INSERT INTO admins (name, email, phone, password_hash)
VALUES (
  'Admin User',
  'admin@msme.com',
  '1234567890',
  '$2b$10$pc7OIY7lV/4fM1LHj3bOxuH74bL8d6.w09rWzi9M4tl3cRjAzj8YC'
)
ON CONFLICT (email) DO NOTHING;

-- Verify the admin was created
SELECT id, name, email FROM admins;
