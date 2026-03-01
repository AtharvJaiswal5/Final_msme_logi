-- Add address columns to orders table
-- This allows buyers to specify delivery address and location when placing orders

-- Add delivery_address column (text field for full address)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Add delivery_lat column (latitude coordinate)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;

-- Add delivery_lng column (longitude coordinate)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- Add comments for documentation
COMMENT ON COLUMN orders.delivery_address IS 'Full delivery address provided by buyer when placing order';
COMMENT ON COLUMN orders.delivery_lat IS 'Delivery location latitude coordinate';
COMMENT ON COLUMN orders.delivery_lng IS 'Delivery location longitude coordinate';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('delivery_address', 'delivery_lat', 'delivery_lng')
ORDER BY column_name;
