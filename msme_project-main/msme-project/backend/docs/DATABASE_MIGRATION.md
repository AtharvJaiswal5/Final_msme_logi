# Database Migration Required for Authentication

## Add Password Column to User Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Add password column to buyers table
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add password column to sellers table  
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add password column to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password VARCHAR(255);
```

## Note
In production, passwords should be hashed using bcrypt. Current implementation stores plain text for development only.

## Future Enhancement
Consider using Supabase Auth instead of custom authentication for production deployment.
