-- Add treatment status and planning fields
-- Migration: add_treatment_status.sql
-- Date: 2025-12-12
-- Purpose: Enable treatment planning workflow with status tracking

-- Add status column with check constraint
ALTER TABLE treatments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed'
CHECK (status IN ('planned', 'completed', 'cancelled'));

-- Add planning-related columns
ALTER TABLE treatments
ADD COLUMN IF NOT EXISTS planned_date DATE,
ADD COLUMN IF NOT EXISTS completed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS planned_by TEXT;

-- Backfill existing data - set completed_date to created_at
UPDATE treatments
SET completed_date = created_at
WHERE status = 'completed' AND completed_date IS NULL;

-- Add indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);
CREATE INDEX IF NOT EXISTS idx_treatments_planned_date ON treatments(planned_date);

-- Add helpful comments
COMMENT ON COLUMN treatments.status IS 'Treatment workflow status: planned (future), completed (done), cancelled';
COMMENT ON COLUMN treatments.planned_date IS 'Target date for planned treatments';
COMMENT ON COLUMN treatments.completed_date IS 'Actual completion timestamp';
COMMENT ON COLUMN treatments.planned_by IS 'Name of user who created the treatment plan';
