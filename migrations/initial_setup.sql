
-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DOCTORS TABLE CHECK & UPDATE
CREATE TABLE IF NOT EXISTS doctors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'banko', 'asistan')),
    pin_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure role constraint is correct
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctors_role_check') THEN
        ALTER TABLE doctors DROP CONSTRAINT doctors_role_check;
    END IF;
    ALTER TABLE doctors ADD CONSTRAINT doctors_role_check CHECK (role IN ('admin', 'doctor', 'banko', 'asistan'));
END $$;

-- 2. PATIENTS TABLE UPDATE
CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    doctor_id UUID REFERENCES doctors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

-- Add new columns for assignment logic
ALTER TABLE patients ADD COLUMN IF NOT EXISTS assignment_type TEXT CHECK (assignment_type IN ('queue', 'preference'));
ALTER TABLE patients ADD COLUMN IF NOT EXISTS assignment_date DATE DEFAULT CURRENT_DATE;

-- 3. TREATMENTS & APPOINTMENTS (Basic checks)
CREATE TABLE IF NOT EXISTS treatments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id),
    treatment_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. NEW TABLES

-- Doctor Queue System
CREATE TABLE IF NOT EXISTS doctor_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    queue_order INTEGER NOT NULL,
    last_assigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(doctor_id)
);

-- Treatment Catalog (Standard Pricing)
CREATE TABLE IF NOT EXISTS treatment_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    standard_price DECIMAL(10,2) NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Password/PIN Change Log
CREATE TABLE IF NOT EXISTS password_change_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    changed_by_user_id UUID REFERENCES doctors(id), -- who performed the change
    target_user_role TEXT -- snapshotted role
);

-- 5. RLS POLICIES

-- Enable RLS on all tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_change_log ENABLE ROW LEVEL SECURITY;

-- Create Permissive Policies (Allow all authenticated users to read/write for now to prevent blocking)
-- In a real strict environment, these would be tighter.

-- Doctors
CREATE POLICY "Allow public read for doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update for doctors" ON doctors FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert for doctors" ON doctors FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Patients
CREATE POLICY "Allow all access for authenticated users on patients" ON patients FOR ALL USING (auth.role() = 'authenticated');

-- Treatments
CREATE POLICY "Allow all access for authenticated users on treatments" ON treatments FOR ALL USING (auth.role() = 'authenticated');

-- Appointments
CREATE POLICY "Allow all access for authenticated users on appointments" ON appointments FOR ALL USING (auth.role() = 'authenticated');

-- New Tables
CREATE POLICY "Allow all access for authenticated users on doctor_queue" ON doctor_queue FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access for authenticated users on treatment_catalog" ON treatment_catalog FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access for authenticated users on password_change_log" ON password_change_log FOR ALL USING (auth.role() = 'authenticated');

-- 6. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_doctor_queue_order ON doctor_queue(queue_order);
