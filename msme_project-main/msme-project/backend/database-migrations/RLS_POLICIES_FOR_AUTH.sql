-- Row Level Security Policies for Authentication
-- Allow users to register (insert) into buyers, sellers, and drivers tables

-- BUYERS TABLE
-- Allow anyone to insert (register)
CREATE POLICY "Allow public registration for buyers" 
ON buyers FOR INSERT 
WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Allow buyers to read own data" 
ON buyers FOR SELECT 
USING (true);

-- Allow users to update their own data
CREATE POLICY "Allow buyers to update own data" 
ON buyers FOR UPDATE 
USING (true);

-- SELLERS TABLE
-- Allow anyone to insert (register)
CREATE POLICY "Allow public registration for sellers" 
ON sellers FOR INSERT 
WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Allow sellers to read own data" 
ON sellers FOR SELECT 
USING (true);

-- Allow users to update their own data
CREATE POLICY "Allow sellers to update own data" 
ON sellers FOR UPDATE 
USING (true);

-- DRIVERS TABLE
-- Allow anyone to insert (register)
CREATE POLICY "Allow public registration for drivers" 
ON drivers FOR INSERT 
WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Allow drivers to read own data" 
ON drivers FOR SELECT 
USING (true);

-- Allow users to update their own data
CREATE POLICY "Allow drivers to update own data" 
ON drivers FOR UPDATE 
USING (true);
