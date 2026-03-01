-- Add otp_verified_at timestamp column to shipments table
-- This tracks when the OTP was verified and delivery was completed

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- Add comment to document the column
COMMENT ON COLUMN shipments.otp_verified_at IS 'Timestamp when OTP was verified and delivery was completed';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shipments' 
AND column_name = 'otp_verified_at';
