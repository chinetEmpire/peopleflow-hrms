-- Notifications table
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,
  type        text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (for triggers and edge functions)
CREATE POLICY "Service role inserts notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast unread count and listing
CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- RPC function to create notifications (security definer for triggers)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_metadata jsonb DEFAULT '{}'
) RETURNS notifications AS $$
  INSERT INTO notifications(user_id, title, body, type, metadata)
  VALUES (p_user_id, p_title, p_body, p_type, p_metadata)
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger function: notify on leave status change
CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    PERFORM create_notification(
      NEW.employee_id,
      'Leave Approved',
      'Your ' || (SELECT name FROM leave_types WHERE id = NEW.leave_type_id) || ' request has been approved.',
      'leave_approved',
      jsonb_build_object('leave_request_id', NEW.id)
    );
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    PERFORM create_notification(
      NEW.employee_id,
      'Leave Rejected',
      'Your ' || (SELECT name FROM leave_types WHERE id = NEW.leave_type_id) || ' request has been rejected.',
      'leave_rejected',
      jsonb_build_object('leave_request_id', NEW.id, 'reason', NEW.rejection_reason)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_status_change
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_status_change();
