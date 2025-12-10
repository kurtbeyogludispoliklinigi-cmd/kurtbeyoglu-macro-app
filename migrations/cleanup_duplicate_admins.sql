-- Gereksiz Admin ve Yönetici kayıtlarını temizleme
-- Bu script sadece gerçekten kullanılmayan duplicate kayıtları silecek

-- Önce mevcut kayıtları görelim (manuel kontrol için)
-- SELECT id, name, role FROM doctors WHERE role = 'admin' OR LOWER(name) LIKE '%yönetici%' OR LOWER(name) LIKE '%admin%';

-- SADECE gereksiz duplicate kayıtları silmek için:
-- "Yönetici" ismindeki kaydı sil (eğer "Admin" zaten varsa)
DELETE FROM doctors
WHERE LOWER(name) = 'yönetici'
  AND role = 'admin';

-- Eğer "Admin" ve başka bir admin isimli kayıt varsa, sadece birini tut
-- Bu kısmı dikkatli kullanın! Manuel olarak hangi admin'i tutmak istediğinizi seçin.

-- Alternatif: Tüm admin kayıtlarını silip tek bir admin oluştur
-- Dikkat: Bu tüm admin kayıtlarını silecek! Önce yedek alın.
-- DELETE FROM doctors WHERE role = 'admin';

-- Yeni tek admin oluştur (isteğe bağlı - eğer hepsini sildiyseniz)
-- INSERT INTO doctors (name, role, pin_code)
-- VALUES ('Admin', 'admin', '0000')
-- ON CONFLICT DO NOTHING;

-- Sonuç: Artık sadece tek bir "Admin" kullanıcısı olmalı
