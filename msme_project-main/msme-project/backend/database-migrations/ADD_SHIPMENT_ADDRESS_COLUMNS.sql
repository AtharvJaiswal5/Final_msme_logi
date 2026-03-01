-- Add pickup_address and drop_address columns to shipments table
-- This allows storing text addresses along with coordinates for pickup and delivery locations

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS drop_address TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN shipments.pickup_address IS 'Full pickup address from seller (warehouse/shop address)';
COMMENT ON COLUMN shipments.drop_address IS 'Full delivery address from buyer (copied from orders.delivery_address)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shipments' 
AND column_name IN ('pickup_address', 'drop_address');
