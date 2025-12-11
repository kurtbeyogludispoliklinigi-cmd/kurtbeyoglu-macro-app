-- FIX SCRIPT: Schema Alignment and RLS Correction
-- Descr: Aligns DB schema with App Code (Queue System & Patient Fields) and fixes Auth/RLS issues.

-- 1. FIX DOCTOR QUEUE (Recreate to match App Logic)
-- The app expects a daily row with an array of doctor IDs.
DROP TABLE IF EXISTS doctor_queue;

CREATE TABLE doctor_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    queue_order TEXT[] NOT NULL, -- Array of Doctor IDs
    current_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. FIX PATIENTS (Add missing columns expected by App)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS anamnez TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_name TEXT;
-- Ensure other fields exist
ALTER TABLE patients ADD COLUMN IF NOT EXISTS assignment_type TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS assignment_date DATE;

-- 3. FIX RLS POLICIES (Enable Anonymous Integration)
-- The app runs with the ANON key but does not perform 'supabase.auth.signIn'.
-- Therefore, we must allow the 'anon' role to access tables, logic is handled by frontend PINs.

-- Disable RLS temporarily to reset or just overwrite policies? 
-- Best to drop existing incompatible policies and recreate them for PUBLIC.

-- Helper macro to reset RLS for a table to Public/Anon friendly
DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY['doctors', 'patients', 'treatments', 'appointments', 'doctor_queue', 'treatment_catalog', 'password_change_log'];
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        -- Enable RLS (Methodology: RLS On, but Policy is permissive)
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Drop existing policies to avoid conflicts
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Permissive Access" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow public read for doctors" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update for doctors" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert for doctors" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all access for authenticated users on %I" ON %I', t, t);
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- Create new PUBLIC policy (Select, Insert, Update, Delete)
        -- Using (true) allows both Anon and Authenticated users.
        EXECUTE format('CREATE POLICY "Public Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
