-- SQL script to update doctors list
-- Run this in your Supabase SQL Editor

-- 1. Berk Yıldırım
UPDATE doctors 
SET name = 'Dt. Berk Yıldırım' 
WHERE name LIKE '%Berk%';

-- If not exists, insert (assuming a role and pin, you might need to adjust these)
INSERT INTO doctors (name, role, pin)
SELECT 'Dt. Berk Yıldırım', 'doctor', '1234'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dt. Berk Yıldırım');


-- 2. Ecem Koç
UPDATE doctors 
SET name = 'Dt. Ecem Koç' 
WHERE name LIKE '%Ecem%';

INSERT INTO doctors (name, role, pin)
SELECT 'Dt. Ecem Koç', 'doctor', '5678'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dt. Ecem Koç');


-- 3. Mustafa Kurtbeyoğlu
UPDATE doctors 
SET name = 'Dt. Mustafa Kurtbeyoğlu' 
WHERE name LIKE '%Mustafa%';

INSERT INTO doctors (name, role, pin)
SELECT 'Dt. Mustafa Kurtbeyoğlu', 'doctor', '9012'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dt. Mustafa Kurtbeyoğlu');
