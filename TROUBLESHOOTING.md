# 🔧 Sorun Giderme Kılavuzu

## 🚨 Kritik Hatalar ve Çözümleri

### ❌ Hata #1: "Hasta eklenmedi. Lütfen tüm bilgileri kontrol edin"

**Ekran Görüntüsü**: IMG_8448.PNG

**Semptomlar**:
- Yeni hasta formu doldurulup "Kaydet" butonuna basıldığında hata mesajı
- Form verileri: Ad, Telefon, Hekim seçimi yapılmış olsa bile kayıt başarısız

**Kök Neden**:
Veritabanı şeması ile uygulama kodu arasında uyumsuzluk:

1. **Eksik Kolon**: `patients` tablosunda `doctor_name` kolonu yok
   - Uygulama `doctor_name` alanını eklemeye çalışıyor (kod satırı: `src/app/page.tsx:549`)
   - Veritabanı bu kolonu tanımıyor → INSERT hatası

2. **Kolon İsim Uyuşmazlığı**: `anamnez` vs `notes`
   - Migration: `notes` kolonu tanımlı (`migrations/initial_setup.sql:30`)
   - Uygulama: `anamnez` alanını kullanıyor (`src/app/page.tsx:552`)
   - Veritabanı `anamnez` kolonunu bulamıyor → INSERT hatası

**Çözüm**:
```bash
# Supabase Dashboard > SQL Editor'e gidin
# migrations/fix_schema_mismatches.sql dosyasını çalıştırın
```

Migration dosyası şu işlemleri yapar:
- ✅ `patients` tablosuna `doctor_name` kolonu ekler
- ✅ `notes` kolonunu `anamnez` olarak yeniden adlandırır
- ✅ Mevcut kayıtlar için `doctor_name` alanını otomatik doldurur

---

### ❌ Hata #2: "Sıra sistemi başlatılamadı"

**Ekran Görüntüsü**: IMG_8447.PNG (iki kez görünüyor)

**Semptomlar**:
- Banko/Asistan rolü ile giriş yapıldığında "Sıra sistemi başlatılamadı" mesajı
- "Sıradaki Hekim" butonu çalışmıyor
- Hasta ekleme sırasında hekim atama sistemi aktif değil

**Kök Neden**:
`doctor_queue` tablosunun yapısı uygulamanın beklediği yapı ile uyuşmuyor:

**Migration Tanımı** (YANLIŞ):
```sql
CREATE TABLE doctor_queue (
    doctor_id UUID,          -- Her hekim için ayrı satır
    queue_order INTEGER,     -- Tek bir sıra numarası
    UNIQUE(doctor_id)        -- Hekim başına bir kayıt
);
```

**Uygulama Beklentisi** (DOĞRU):
```typescript
{
  date: '2025-12-10',        // Gün başına bir kayıt
  queue_order: [uuid1, uuid2, uuid3],  // Hekim ID'leri dizisi
  current_index: 0           // Şu anki sıradaki hekim indexi
}
```

**Sonuç**: Uygulama `date`, `queue_order` (array), `current_index` kolonlarını eklerken hata alıyor.

**Çözüm**:
```bash
# Supabase Dashboard > SQL Editor'e gidin
# migrations/fix_schema_mismatches.sql dosyasını çalıştırın
```

Migration dosyası şu işlemleri yapar:
- ✅ Eski `doctor_queue` tablosunu DROP eder
- ✅ Doğru şema ile yeniden oluşturur:
  - `date DATE UNIQUE` → Günlük sıra kaydı
  - `queue_order UUID[]` → Hekim ID'leri dizisi
  - `current_index INTEGER` → Şu anki pozisyon
- ✅ RLS politikalarını yeniden uygular

---

## 📋 Migration Uygulama Adımları

### 1️⃣ Supabase Dashboard'a Erişim

1. https://supabase.com/dashboard adresine gidin
2. Projenizi seçin: **Kurtbeyoğlu Diş Kliniği**
3. Sol menüden **SQL Editor** seçeneğine tıklayın

### 2️⃣ Migration Dosyasını Çalıştırma

1. "New query" butonuna tıklayın
2. Aşağıdaki dosyanın içeriğini kopyalayıp yapıştırın:
   ```
   migrations/fix_schema_mismatches.sql
   ```
3. **RUN** butonuna basın (sağ alt köşe)
4. Yeşil "Success" mesajını bekleyin

### 3️⃣ Doğrulama

Migration başarılı olduktan sonra doğrulama sorguları otomatik olarak çalışır:

**doctor_queue Tablosu Kontrolü**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doctor_queue'
ORDER BY ordinal_position;
```

**Beklenen Sonuç**:
| column_name   | data_type                |
|---------------|--------------------------|
| id            | uuid                     |
| date          | date                     |
| queue_order   | ARRAY                    |
| current_index | integer                  |
| created_at    | timestamp with time zone |
| updated_at    | timestamp with time zone |

**patients Tablosu Kontrolü**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
```

**Beklenen Sonuç** (en az şunlar olmalı):
| column_name      | data_type |
|------------------|-----------|
| id               | uuid      |
| name             | text      |
| phone            | text      |
| doctor_id        | uuid      |
| **doctor_name**  | **text**  | ← Yeni eklendi
| **anamnez**      | **text**  | ← 'notes'tan yeniden adlandırıldı
| assignment_type  | text      |
| assignment_date  | date      |
| created_at       | timestamp |

### 4️⃣ Uygulamayı Test Etme

Migration tamamlandıktan sonra:

1. **Tarayıcıda uygulamayı yenileyin** (Hard refresh: Cmd+Shift+R / Ctrl+Shift+F5)
2. **Banko/Asistan ile giriş yapın**
3. **Kontrol #1**: "Sıra sistemi başlatılamadı" mesajı kaybolmalı ✅
4. **Kontrol #2**: "Yeni Hasta" butonuna basın
5. **Kontrol #3**: "Sıradaki Hekim" butonu aktif olmalı ✅
6. **Kontrol #4**: Test hastası ekleyin (form başarıyla kaydedilmeli) ✅

---

## 🛡️ Gelecekte Bu Hataları Önleme

### Development Workflow İyileştirmeleri

1. **Schema Validation Script**:
   ```bash
   # migrations/validate_schema.sh oluşturun
   npm run validate-schema  # TypeScript types vs Supabase schema
   ```

2. **Type Generation**:
   ```bash
   # Supabase CLI ile otomatik TypeScript type generation
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

3. **Pre-commit Hook**:
   ```bash
   # .husky/pre-commit dosyasına ekleyin
   npm run typecheck
   npm run validate-schema
   ```

### Code Review Checklist

Migration dosyaları için:
- [ ] Tüm kolonlar uygulama kodunda kullanılıyor mu?
- [ ] Kolon isimleri TypeScript interface ile uyumlu mu?
- [ ] Array/JSON tipleri doğru tanımlanmış mı?
- [ ] RLS politikaları uygulanmış mı?
- [ ] Index'ler performans için optimize edilmiş mi?

---

## 📚 İlgili Dosyalar

**Sorun Analizi**:
- Ekran görüntüleri: `IMG_8448.PNG`, `IMG_8447.PNG`

**Kod Referansları**:
- Ana uygulama: `src/app/page.tsx`
  - Hasta ekleme: Satır 519-568
  - Queue başlatma: Satır 270-310
  - Queue'dan hekim alma: Satır 312-342

**Database**:
- Orijinal migration: `migrations/initial_setup.sql`
- **Fix migration**: `migrations/fix_schema_mismatches.sql` ← **ÖNEMLİ**

**Dokümantasyon**:
- Proje genel bakış: `CLAUDE.md`
- Bu sorun giderme kılavuzu: `TROUBLESHOOTING.md`

---

## 🆘 Hala Sorun mu Yaşıyorsunuz?

### Debug Kontrol Listesi

**1. Supabase Bağlantısı**:
```bash
# .env.local dosyasını kontrol edin
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  # ✅ Doğru
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key               # ✅ Doğru
```

**2. Browser DevTools Konsolu**:
```javascript
// Console'da hataları kontrol edin
// Network tab'da Supabase isteklerini inceleyin
// 400/500 hata kodları varsa detaylarını kaydedin
```

**3. Supabase Dashboard Logs**:
```
Project Settings > Logs > Postgres Logs
→ INSERT/UPDATE hatalarını arayın
```

**4. RLS Politikaları**:
```sql
-- Supabase SQL Editor'de çalıştırın
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

**5. Cache Temizleme**:
```bash
# Development'ta PWA cache'i devre dışı bırakın
# Chrome DevTools > Application > Clear Storage > Clear site data
```

### Destek İçin

1. **GitHub Issue Açın**:
   - Ekran görüntüsü ekleyin
   - Browser console log'larını paylaşın
   - Supabase error mesajlarını ekleyin

2. **Bilgi Toplama**:
   ```bash
   npm run build  # Build hataları var mı?
   npx tsc --noEmit  # TypeScript hataları var mı?
   ```

3. **Acil Durum Rollback**:
   ```sql
   -- Eğer migration sorun çıkarırsa, eski haline döndürün
   -- initial_setup.sql dosyasını yeniden çalıştırın
   -- ANCAK: Veri kaybı riski var, önce backup alın!
   ```

---

**Son Güncelleme**: 2025-12-10
**Durum**: ✅ Sorunlar tespit edildi ve fix migration hazırlandı
**Sonraki Adım**: Migration dosyasını Supabase Dashboard'da çalıştırın
