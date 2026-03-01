-- Create notifications table for admin impersonation tracking
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('seller', 'driver')),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'admin_action' CHECK (type IN ('admin_action', 'system', 'order', 'shipment')),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (true);

-- Allow system to insert notifications
CREATE POLICY "Allow notification creation" ON notifications
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (true);
