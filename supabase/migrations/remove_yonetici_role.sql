-- Migration: Remove 'yönetici' role and standardize to 'admin'
-- Purpose: Clean up role naming and ensure consistency

-- Step 1: Update existing 'yönetici' entries to 'admin'
UPDATE doctors
SET role = 'admin'
WHERE role = 'yönetici';

-- Step 2: Drop old role constraint if exists
ALTER TABLE doctors
DROP CONSTRAINT IF EXISTS doctors_role_check;

-- Step 3: Add new role constraint with only 4 roles
ALTER TABLE doctors
ADD CONSTRAINT doctors_role_check
CHECK (role IN ('admin', 'doctor', 'banko', 'asistan'));

COMMENT ON CONSTRAINT doctors_role_check ON doctors IS 'Enforces 4-role system: admin, doctor, banko, asistan';
