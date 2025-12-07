-- DentistNote Pro - Randevu Sistemi
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- Appointments tablosu
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Enable RLS (Row Level Security)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Herkes okuyabilir (authenticated users)
CREATE POLICY "Enable read access for all users" ON appointments
    FOR SELECT USING (true);

-- Policy: Herkes ekleyebilir
CREATE POLICY "Enable insert for all users" ON appointments
    FOR INSERT WITH CHECK (true);

-- Policy: Herkes güncelleyebilir
CREATE POLICY "Enable update for all users" ON appointments
    FOR UPDATE USING (true);

-- Policy: Herkes silebilir
CREATE POLICY "Enable delete for all users" ON appointments
    FOR DELETE USING (true);

-- Realtime'ı etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
