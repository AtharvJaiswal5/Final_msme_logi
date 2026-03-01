-- Add delivery_address column to orders table
-- This allows buyers to provide a text address along with coordinates

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Add comment to document the column
COMMENT ON COLUMN orders.delivery_address IS 'Full delivery address provided by buyer (house/flat, street, area, landmark)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'delivery_address';
