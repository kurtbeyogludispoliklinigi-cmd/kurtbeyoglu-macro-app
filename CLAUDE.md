
# Kurtbeyoğlu Diş Kliniği - Teknik Dokümantasyon

## Geliştirici Notları

Bu dosya **teknik ekip** içindir. Son kullanıcı dokümantasyonu **uygulama içinde** "Yardım" butonunda mevcuttur.

## Proje Özeti
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Son Güncellemeler (v2.0)

### Yeni Özellikler
1. **Akıllı Hekim Atama Sistemi (Queue System)**:
   - `doctor_queue` tablosu üzerinden günlük sıra takibi.
   - Banko görevlileri için "Sıradaki Hekim" butonu.
   - Algoritma: Dengeli dağılım (Round-robin).

2. **Tedavi Fiyat Kütüphanesi (Treatment Catalog)**:
   - `treatment_catalog` tablosu.
   - Otomatik fiyat önerisi ve indirim hesaplama (`%10 indirim` mantığı).
   - Yeni tedavilerin kataloga otomatik eklenmesi.

3. **Şifre Yönetimi**:
   - `password_change_log` ile değişiklik takibi.
   - Kullanıcıların kendi PIN'lerini güvenli şekilde değiştirebilmesi.

4. **Uygulama İçi Yardım Sistemi**:
   - `HelpModal.tsx` bileşeni.
   - Rol bazlı içerik gösterimi (Admin, Doktor, Banko).
   - Sağ alt köşede her zaman erişilebilir yardım butonu.

### Database Değişiklikleri
Tüm şema değişiklikleri `migrations/initial_setup.sql` dosyasında mevcuttur.

```sql
-- Yeni tablolar
CREATE TABLE doctor_queue (...);
CREATE TABLE treatment_catalog (...);
CREATE TABLE password_change_log (...);

-- patients tablosu güncellemeleri
ALTER TABLE patients ADD COLUMN assignment_type TEXT; -- 'queue' | 'preference'
ALTER TABLE patients ADD COLUMN assignment_date DATE;
```

## Development Komutları
```bash
npm install          # Bağımlılıkları yükle
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Database Migration
1. Supabase Dashboard > SQL Editor'e gidin.
2. `migrations/initial_setup.sql` dosyasının içeriğini yapıştırın.
3. Sorguyu çalıştırın ("Run").
4. **Önemli**: RLS politikaları "Permissive" olarak ayarlanmıştır, prodüksiyon öncesi gözden geçirilmelidir.

## Environment Variables
`.env.local` dosyasında bulunması gerekenler:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Geliştirici İpuçları
- **Loglar**: `console.log` kullanımı temizlenmiştir. Hata takibi için `console.error` ve `useToast` kullanın.
- **Tip Güvenliği**: TypeScript "strict" moddadır. `any` kullanmaktan kaçının.
- **Yardım İçeriği**: `src/components/HelpModal.tsx` içindeki `sections` dizisinden güncellenebilir.
