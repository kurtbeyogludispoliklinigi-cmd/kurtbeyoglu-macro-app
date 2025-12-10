-- Password Change Log Table
-- Tracks all password changes for security and audit purposes

CREATE TABLE IF NOT EXISTS password_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  CONSTRAINT fk_doctor_id FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Index for fast lookup by doctor
CREATE INDEX IF NOT EXISTS idx_password_log_doctor_id ON password_change_log(doctor_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_password_log_changed_at ON password_change_log(changed_at DESC);

-- Enable Row Level Security
ALTER TABLE password_change_log ENABLE ROW LEVEL SECURITY;

-- Permissive policy (consistent with app architecture)
CREATE POLICY "Permissive Access"
  ON password_change_log
  FOR ALL
  USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE password_change_log;

COMMENT ON TABLE password_change_log IS 'Audit log for password change events';
COMMENT ON COLUMN password_change_log.doctor_id IS 'Reference to doctor whose password was changed';
COMMENT ON COLUMN password_change_log.changed_by IS 'Name of user who initiated the change';
COMMENT ON COLUMN password_change_log.ip_address IS 'IP address from which change was made';
COMMENT ON COLUMN password_change_log.user_agent IS 'Browser/device info';
