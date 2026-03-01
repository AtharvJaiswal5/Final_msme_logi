-- Add missing columns to drivers table

-- Add email column
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Add name column (if missing)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Verify all required columns exist
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers'
AND column_name IN ('id', 'name', 'email', 'phone', 'password')
ORDER BY column_name;
