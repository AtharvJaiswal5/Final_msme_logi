-- Add phone column to sellers and drivers tables (buyers already has it)

-- Add phone to sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add phone to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Verify columns exist
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('buyers', 'sellers', 'drivers') 
AND column_name IN ('phone', 'password', 'email')
ORDER BY table_name, column_name;
