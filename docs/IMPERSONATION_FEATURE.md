# 👤 Admin Impersonation Feature

## Overview
Admins can now impersonate sellers and drivers to view and manage their accounts. All actions taken during impersonation are logged and the user receives notifications.

## Setup Instructions

### 1. Create Notifications Table
Run this SQL in Supabase:
```sql
-- Copy and run the entire content from:
msme_project-main/msme-project/backend/CREATE_NOTIFICATIONS_TABLE.sql
```

### 2. Restart Backend (Already Done)
Backend is running with impersonation routes enabled.

## How to Use

### Starting Impersonation
1. Login as admin at http://localhost:5173
2. On the Admin Dashboard, you'll see "Impersonate User" section
3. Click either "Impersonate Seller" or "Impersonate Driver"
4. Select a user from the list
5. Click "Impersonate" button
6. You'll be redirected to that user's portal

### During Impersonation
- Orange banner appears at the top showing:
  - Who you're viewing as
  - Your admin name
  - "Exit Impersonation" button
- You have full access to that user's portal
- You can perform any actions as that user
- All actions are logged

### Exiting Impersonation
- Click "Exit Impersonation" button in the banner
- You'll be returned to the Admin Dashboard
- The user receives a notification that admin stopped viewing

## Features

### Security
- Only admins can impersonate
- Only sellers and drivers can be impersonated (buyers cannot)
- All impersonation sessions are logged
- Users are notified when admin starts/stops viewing

### Notifications
Users receive notifications for:
- When admin starts viewing their account
- When admin stops viewing their account
- Any actions admin performs while impersonating

### UI/UX
- Clear visual indicator (orange banner) when impersonating
- Easy exit button always visible
- Modal to select which user to impersonate
- Smooth transitions between accounts

## API Endpoints

### POST /impersonation/start
Start impersonating a user
```json
{
  "adminId": "uuid",
  "targetUserId": "uuid",
  "targetRole": "seller" | "driver"
}
```

### POST /impersonation/end
End impersonation session
```json
{
  "adminId": "uuid",
  "targetUserId": "uuid",
  "targetRole": "seller" | "driver"
}
```

### POST /impersonation/log-action
Log an admin action during impersonation
```json
{
  "adminId": "uuid",
  "adminName": "string",
  "targetUserId": "uuid",
  "targetRole": "seller" | "driver",
  "action": "string",
  "details": "object"
}
```

### GET /impersonation/users/:role
Get list of users for impersonation
- `:role` can be "seller" or "driver"

## Files Created/Modified

### Backend
- `src/routes/impersonationRoutes.ts` (new)
- `src/server.ts` (updated - added impersonation routes)
- `CREATE_NOTIFICATIONS_TABLE.sql` (new)

### Frontend
- `src/context/AuthContext.tsx` (updated - added impersonation methods)
- `src/components/ImpersonationBanner.tsx` (new)
- `src/styles/ImpersonationBanner.css` (new)
- `src/pages/Admin.tsx` (updated - added impersonation UI)
- `src/styles/Admin.css` (updated - added impersonation styles)
- `src/App.tsx` (updated - added banner component)

## Database Schema

### notifications table
```sql
- id: UUID (primary key)
- user_id: UUID (not null)
- user_role: TEXT (seller | driver)
- message: TEXT (not null)
- type: TEXT (admin_action | system | order | shipment)
- is_read: BOOLEAN (default false)
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

## Testing

1. Login as admin
2. Click "Impersonate Seller"
3. Select a seller from the list
4. Verify you're redirected to seller portal
5. Verify orange banner appears at top
6. Perform some actions (confirm orders, etc.)
7. Click "Exit Impersonation"
8. Verify you're back at admin dashboard
9. Check seller's notifications (future feature to display them)

## Future Enhancements
- Display notifications to users in their portal
- Add notification center/bell icon
- Track detailed action history
- Add impersonation audit log in admin panel
- Add ability to send messages to users during impersonation
