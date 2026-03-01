# Admin Portal Setup Instructions

## Step 1: Create Admin Table in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire content from `CREATE_ADMIN_TABLE.sql`
4. Click "Run" to execute the SQL

This will:
- Create the `admins` table
- Set up Row Level Security (RLS) policies
- Create a default admin user with credentials:
  - Email: `admin@msme.com`
  - Password: `admin123`

## Step 2: Restart Backend Server

Kill any running backend processes and restart:

```bash
cd msme_project-main/msme-project/backend
npm start
```

## Step 3: Access Admin Portal

1. Open your browser and go to `http://localhost:5173`
2. Click on "Login as Admin" card
3. Enter credentials:
   - Email: `admin@msme.com`
   - Password: `admin123`
4. You'll be redirected to the Admin Dashboard

## Admin Dashboard Features

The admin portal includes:

- **Overview Statistics**: Total orders, revenue, users, shipments, products
- **Orders Timeline**: View orders over time (daily, weekly, monthly, yearly)
- **Top Products**: See which products are selling the most
- **Order Status Distribution**: Pie chart showing order statuses
- **User Statistics**: Distribution of buyers, sellers, and drivers
- **Revenue Timeline**: Track revenue over time

## Changing Admin Password

To create a new admin with a different password:

1. Run the password hash generator:
   ```bash
   cd msme_project-main/msme-project/backend
   npx ts-node src/scripts/createAdminHash.ts
   ```

2. Copy the generated hash

3. In Supabase SQL Editor, run:
   ```sql
   INSERT INTO admins (name, email, phone, password_hash)
   VALUES (
     'Your Name',
     'your@email.com',
     '1234567890',
     'PASTE_HASH_HERE'
   );
   ```

## Troubleshooting

If you see errors:
- Make sure the SQL was executed successfully in Supabase
- Check that the backend server is running on port 5000
- Verify the frontend is running on port 5173
- Check browser console for any errors
