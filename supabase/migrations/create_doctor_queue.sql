-- Create doctor_queue table for round-robin patient assignment
CREATE TABLE IF NOT EXISTS doctor_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  queue_order TEXT[] NOT NULL,
  current_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy (permissive mode like other tables)
CREATE POLICY "Permissive Access" ON doctor_queue FOR ALL USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_queue;

-- Create index for faster date lookups
CREATE INDEX idx_doctor_queue_date ON doctor_queue(date);

-- Add comment
COMMENT ON TABLE doctor_queue IS 'Daily round-robin queue for automatic doctor assignment to new patients';
