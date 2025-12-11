-- ═══════════════════════════════════════════════════════════════════════
-- FIX SCHEMA MISMATCHES - Critical Bug Fix Migration
-- Date: 2025-12-10
-- Issues: Queue system failure + Patient add failure
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- ISSUE #1: Fix doctor_queue table structure
-- ═══════════════════════════════════════════════════════════════════════
-- Problem: Migration created one row per doctor (doctor_id + queue_order)
-- Expected: One row per day with array of doctor IDs (date + queue_order[])
-- ═══════════════════════════════════════════════════════════════════════

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS doctor_queue CASCADE;

CREATE TABLE doctor_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,                    -- ✅ One row per day
    queue_order UUID[] NOT NULL,                  -- ✅ Array of doctor IDs
    current_index INTEGER DEFAULT 0 NOT NULL,     -- ✅ Current position in queue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create index for date lookups
CREATE INDEX idx_doctor_queue_date ON doctor_queue(date);

-- Enable RLS
ALTER TABLE doctor_queue ENABLE ROW LEVEL SECURITY;

-- Recreate policy
DROP POLICY IF EXISTS "Allow all access for authenticated users on doctor_queue" ON doctor_queue;
CREATE POLICY "Allow all access for authenticated users on doctor_queue"
    ON doctor_queue FOR ALL
    USING (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════
-- ISSUE #2: Fix patients table missing columns
-- ═══════════════════════════════════════════════════════════════════════
-- Problem: Missing doctor_name column, anamnez vs notes naming conflict
-- ═══════════════════════════════════════════════════════════════════════

-- Add doctor_name column (required for display)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- Rename 'notes' to 'anamnez' to match application code
-- Check if 'notes' exists and 'anamnez' doesn't exist
DO $$
BEGIN
    -- If 'notes' column exists and 'anamnez' doesn't, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'notes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'anamnez'
    ) THEN
        ALTER TABLE patients RENAME COLUMN notes TO anamnez;
    END IF;

    -- If both exist, drop 'notes' (anamnez is primary)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'notes'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'anamnez'
    ) THEN
        ALTER TABLE patients DROP COLUMN notes;
    END IF;

    -- If neither exists, create anamnez
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'anamnez'
    ) THEN
        ALTER TABLE patients ADD COLUMN anamnez TEXT;
    END IF;
END $$;

-- Backfill doctor_name from doctors table for existing patients
UPDATE patients p
SET doctor_name = d.name
FROM doctors d
WHERE p.doctor_id = d.id AND p.doctor_name IS NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════
-- Run these after migration to verify fixes:

-- Check doctor_queue schema
-- Expected: id, date, queue_order (uuid[]), current_index, created_at, updated_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doctor_queue'
ORDER BY ordinal_position;

-- Check patients schema
-- Expected: id, name, phone, doctor_id, doctor_name, anamnez, assignment_type, assignment_date, created_at, updated_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;

-- Verify no orphaned data
SELECT COUNT(*) as patients_without_doctor_name
FROM patients
WHERE doctor_name IS NULL AND doctor_id IS NOT NULL;
