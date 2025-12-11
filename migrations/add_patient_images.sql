-- Create patient_images table
CREATE TABLE IF NOT EXISTS patient_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,           -- Storage path: patient-images/{patient_id}/{filename}
    file_name TEXT NOT NULL,           -- Original filename
    file_size INTEGER,                 -- Size in bytes
    mime_type TEXT,                    -- image/jpeg, image/png, etc.
    film_type TEXT NOT NULL CHECK (film_type IN ('panoramik', 'periapikal')),
    capture_date DATE NOT NULL,        -- When the film was taken
    notes TEXT,                        -- Optional notes
    uploaded_by UUID REFERENCES doctors(id),
    uploaded_by_name TEXT,             -- Denormalized for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_images_patient ON patient_images(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_images_capture_date ON patient_images(capture_date DESC);

-- Enable RLS
ALTER TABLE patient_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy for table access (Allow all authenticated users to read/write/delete for now as per requirements)
-- "Tüm roller (admin, doctor, banko, asistan) görsel yükleyebilmeli"
-- "Görsel Silme: Tüm roller kendi yükledikleri veya yetkili oldukları görselleri silebilmeli"
-- Start with a broad policy as requested in the schema section of prompt: "patient_images_all_access"
CREATE POLICY "patient_images_all_access" ON patient_images FOR ALL USING (true);


-- Storage Bucket Setup (Attempt to create if not exists, though often needs Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-images', 'patient-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-images');

-- Allow authenticated reads
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-images');

-- Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-images');
