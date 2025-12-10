-- Add assignment tracking columns to patients table
-- This enables tracking how patients were assigned to doctors

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'preference'
CHECK (assignment_type IN ('queue', 'preference'));

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS assignment_date DATE DEFAULT CURRENT_DATE;

-- Add index for faster queries on assignment_date
CREATE INDEX IF NOT EXISTS idx_patients_assignment_date ON patients(assignment_date);

-- Add index for faster queries on assignment_type
CREATE INDEX IF NOT EXISTS idx_patients_assignment_type ON patients(assignment_type);

-- Add comment for documentation
COMMENT ON COLUMN patients.assignment_type IS 'How the patient was assigned: queue (automatic via queue system) or preference (manually selected doctor)';
COMMENT ON COLUMN patients.assignment_date IS 'Date when the patient was assigned to the doctor';
