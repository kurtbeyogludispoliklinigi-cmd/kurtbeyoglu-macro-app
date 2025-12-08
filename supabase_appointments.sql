
-- RLS Policies for DentistNote Pro (Permissive Mode for PIN Auth)
-- Since the app uses PIN based auth (not Supabase Auth), we must allow operations for anonymous/client users.
-- Privacy is handled on the FRONTEND (page.tsx) by filtering data based on the selected User ID.

-- Enable RLS (required to have policies, but we will make them permissive)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- 1. Appointments Policies
DROP POLICY IF EXISTS "Doctors can only see their own appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can only insert their own appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can only update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can only delete their own appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can see all appointments" ON appointments;

-- Revert to Permissive
CREATE POLICY "Permissive Access Appointments" ON appointments
    FOR ALL USING (true) WITH CHECK (true);


-- 2. Patients Policies
DROP POLICY IF EXISTS "Doctors can only see their own patients" ON patients;
DROP POLICY IF EXISTS "Doctors can only insert their own patients" ON patients;
DROP POLICY IF EXISTS "Doctors can only update their own patients" ON patients;
DROP POLICY IF EXISTS "Doctors can only delete their own patients" ON patients;
DROP POLICY IF EXISTS "Admins can see all patients" ON patients;

-- Revert to Permissive
CREATE POLICY "Permissive Access Patients" ON patients
    FOR ALL USING (true) WITH CHECK (true);


-- 3. Treatments Policies
DROP POLICY IF EXISTS "Doctors can only see their own treatments" ON treatments;
DROP POLICY IF EXISTS "Admins can see all treatments" ON treatments;
-- (Assuming treatments didn't have specific write rules in the strict version, but making sure)

-- Revert to Permissive
CREATE POLICY "Permissive Access Treatments" ON treatments
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure Realtime works (usually requires publication)
alter publication supabase_realtime add table appointments, patients, treatments;
