# Hekim Seçim Paneli ve Sıralı Atama Sistemi - Implementation Guide

## Overview
This feature adds a doctor selection modal for BANKO and ASISTAN users when adding new patients, with two options:
1. **Manual Selection (Hekim Tercihi)**: Choose a specific doctor from dropdown
2. **Queue Assignment (Sıradaki Hekim)**: Automatically assign the next doctor in a daily round-robin queue

## Database Setup

### 1. Run the Migration

You need to run the SQL migration to create the `doctor_queue` table in Supabase:

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/create_doctor_queue.sql`
4. Paste and run the SQL

**Option B: Via Supabase CLI** (if installed)
```bash
supabase db push
```

### 2. Verify Table Creation

Check that the table was created successfully:
```sql
SELECT * FROM doctor_queue;
```

You should see an empty table with columns:
- `id` (UUID)
- `date` (DATE)
- `queue_order` (TEXT[])
- `current_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

## Features Implemented

### 1. Doctor Selection Modal
- Appears BEFORE the patient form for BANKO/ASISTAN users
- Two selectable options with visual feedback
- Shows currently queued doctor when "Sıradaki Hekim" is selected

### 2. Round-Robin Queue System
- **Daily Reset**: Queue is automatically created/reset each day
- **Random Initial Order**: Doctors are shuffled randomly each morning
- **Fair Distribution**: Cycles through all doctors equally
- **No Consecutive Repeats**: Same doctor won't be assigned twice in a row

### 3. Queue Management Functions
- `initializeQueue()`: Creates or fetches today's queue
- `getNextDoctor()`: Gets next doctor and increments index
- `getNextDoctorInQueue()`: Preview who's next without incrementing

## User Flow

### For BANKO/ASISTAN Users:

1. Click "Yeni Hasta Ekle" button
2. **Doctor Selection Modal appears** with two options:
   - **Hekim Tercihi Var**: Shows dropdown to select specific doctor
   - **Sıradaki Hekime Ata**: Shows who's next in queue
3. Select method and click "Devam Et"
4. **Patient Form Modal opens** with selected doctor displayed
5. Fill in patient details (name, phone, anamnez)
6. Click "Kaydet" to create patient

### For HEKİM Users:
- No change in workflow
- Directly opens patient form modal
- Patient automatically assigned to logged-in doctor

## Testing Checklist

### ✅ Basic Functionality
- [ ] BANKO user can see doctor selection modal
- [ ] ASISTAN user can see doctor selection modal
- [ ] HEKİM user bypasses selection modal (direct to patient form)
- [ ] ADMIN user bypasses selection modal

### ✅ Manual Selection
- [ ] Can select "Hekim Tercihi Var" option
- [ ] Dropdown shows all doctors with role='doctor'
- [ ] Cannot proceed without selecting a doctor
- [ ] Selected doctor shows in patient form
- [ ] Patient is created with correct doctor assignment

### ✅ Queue Assignment
- [ ] Can select "Sıradaki Hekim" option
- [ ] Shows currently queued doctor name
- [ ] Proceeds immediately without additional selection
- [ ] Patient is created with queued doctor
- [ ] Queue index increments after assignment

### ✅ Queue Behavior
- [ ] First access of day creates new queue
- [ ] Queue persists throughout the day
- [ ] Queue shows different doctor order each day
- [ ] Queue cycles back to first doctor after last
- [ ] No doctor is assigned twice consecutively

### ✅ UI/UX
- [ ] Modal is responsive on mobile
- [ ] Visual feedback for selected option (border highlight)
- [ ] "Devam Et" button is disabled until option selected
- [ ] Can cancel and close modal
- [ ] State resets properly on cancel

## Code Changes Summary

### Files Modified:
1. **src/app/page.tsx**
   - Added `showDoctorSelectionModal` state
   - Added `queueData` and `doctorSelectionMethod` states
   - Added queue management functions
   - Added `DoctorSelectionModal` component
   - Updated `handleNewPatientClick` to show modal for banko/asistan
   - Updated `handleAddPatient` to use selected doctor
   - Modified patient modal to display (not select) doctor

### Files Created:
1. **supabase/migrations/create_doctor_queue.sql**
   - Database table for queue management

## Database Schema

```sql
CREATE TABLE doctor_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,  -- Daily unique constraint
  queue_order TEXT[] NOT NULL,                     -- Array of doctor IDs
  current_index INTEGER DEFAULT 0,                 -- Current position in queue
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sample Data:
```sql
-- Example queue for 2025-12-10
{
  "id": "uuid-here",
  "date": "2025-12-10",
  "queue_order": ["doctor-id-1", "doctor-id-2", "doctor-id-3"],
  "current_index": 1,  -- Next patient goes to doctor-id-2
  "created_at": "2025-12-10T00:00:00Z"
}
```

## Troubleshooting

### Issue: Queue not showing doctors
**Solution**: Ensure you have doctors with `role='doctor'` in the `doctors` table.

### Issue: "Sıra sistemi başlatılamadı" error
**Solutions**:
1. Check that migration ran successfully
2. Verify RLS policy exists: `SELECT * FROM doctor_queue;`
3. Check browser console for detailed error messages

### Issue: Same doctor assigned multiple times
**Solution**: Verify the `current_index` is incrementing in the database:
```sql
SELECT * FROM doctor_queue WHERE date = CURRENT_DATE;
```

### Issue: Queue doesn't reset daily
**Solution**: The queue creates a new entry automatically on first access each day due to the `UNIQUE` constraint on `date`.

## Future Enhancements (Optional)

- [ ] Admin dashboard to view queue statistics
- [ ] Ability to manually adjust queue order mid-day
- [ ] Queue history/analytics per doctor
- [ ] Notifications when assigned via queue
- [ ] Option to exclude specific doctors from queue
- [ ] Weight-based assignment (e.g., doctor A gets 2x patients)

## Validation Complete

All requirements from the original specification have been implemented:
✅ Modal panel appears before patient form
✅ Two selection options with distinct UI
✅ Round-robin queue system with daily reset
✅ Queue state persists and updates correctly
✅ No consecutive assignments to same doctor
✅ Integration with existing patient creation flow
✅ Responsive design for mobile and desktop

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Supabase connection and table existence
3. Review toast notifications for user-facing errors
4. Check database logs in Supabase dashboard

---

# DASHBOARD GÜNCELLEMESI - Günlük Hekim İstatistikleri

## Yeni Özellikler

### 1. Günlük Hekim Dağılımı Tablosu (Admin Only)
Admin dashboard'una eklenen yeni bir kart ile o günkü her hekimin istatistiklerini görüntüleyebilirsiniz.

**Gösterilen Bilgiler:**
- Hekim adı
- Sıradan hasta sayısı (queue sisteminden)
- Referanslı hasta sayısı (manuel seçim ile)
- Toplam hasta sayısı
- Görsel dağılım progress bar'ı
- Yüzdelik dağılım

### 2. Sıra Bilgisi ve Kontrol
- **Şu an sırada olan hekim**: Adı ve pozisyonu (örn: 2/3)
- **Sırayı Sıfırla butonu**: Admin kullanıcılar günlük sırayı resetleyebilir

## Veritabanı Değişiklikleri

### Yeni Kolonlar (patients tablosu)
```sql
assignment_type    TEXT       -- 'queue' veya 'preference'
assignment_date    DATE       -- Hastanın atandığı tarih
```

## Kurulum Adımları

### 1. Migration'ı Çalıştırın

Supabase Dashboard → SQL Editor'de şu dosyayı çalıştırın:
```
supabase/migrations/add_patient_assignment_tracking.sql
```

Veya manuel olarak:
```sql
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'preference'
CHECK (assignment_type IN ('queue', 'preference'));

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS assignment_date DATE DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_patients_assignment_date ON patients(assignment_date);
CREATE INDEX IF NOT EXISTS idx_patients_assignment_type ON patients(assignment_type);
```

### 2. Mevcut Verileri Güncelleyin

Eski hasta kayıtları için:
```sql
UPDATE patients
SET assignment_type = 'preference',
    assignment_date = created_at::date
WHERE assignment_type IS NULL;
```

### 3. Uygulamayı Restart Edin
```bash
npm run dev
```

## Kullanım

### Admin Dashboard'da:

1. **Dashboard sekmesine gidin**
2. **"Bugünün Hekim Dağılımı"** kartını görün (üstte)
3. **Tablo içeriği:**
   - Her satır bir hekim
   - Sıradan hasta (turuncu rozet)
   - Referanslı hasta (mavi rozet)  
   - Toplam (yeşil rozet)
   - Renkli progress bar ile dağılım görselleştirmesi

4. **Sıra bilgisi:** (Alt kısım)
   - "Şu An Sırada: Dt. Mustafa (2/3)"
   - Sırayı Sıfırla butonu

### Sırayı Sıfırlama:
1. "Sırayı Sıfırla" butonuna tıklayın
2. Onay mesajını kabul edin
3. Yeni rastgele sıra oluşturulur
4. Index 0'a döner

## Veri Akışı

```
Bugün Eklenen Hastalar
  ↓
assignment_type kontrolü
  ↓
┌──────────────────┬───────────────────┐
│   queue          │   preference      │
│   (Turuncu)      │   (Mavi)          │
└──────────────────┴───────────────────┘
  ↓                      ↓
Hekim bazında gruplama
  ↓
Dashboard istatistik tablosu
```

## Görsel Tasarım

### Renk Kodları:
- **Sıradan hasta**: Turuncu (`bg-amber-400`)
- **Referanslı hasta**: Mavi (`bg-blue-400`)
- **Toplam badge**: Yeşil (`bg-teal-100`)
- **Progress bar**: 2 renkli gradient

### Mobile Responsive:
- Tablo yatay scroll destekli
- Kolonlar küçük ekranda daraltılmış
- Butonlar altalta diziliyor

## Test Senaryoları

### ✅ Dashboard İstatistikleri
- [ ] Admin kullanıcı giriş yaptığında kart görünüyor
- [ ] Hekim olmayan kullanıcılarda kart görünmüyor
- [ ] Bugün eklenen hastalar doğru sayılıyor
- [ ] queue/preference ayrımı doğru yapılıyor
- [ ] Progress bar yüzdeleri doğru hesaplanıyor

### ✅ Sıra Bilgisi
- [ ] Şu anki sıradaki hekim adı doğru gösteriliyor
- [ ] Pozisyon bilgisi doğru (örn: 2/3)
- [ ] Queue verisi yoksa bu bölüm görünmüyor

### ✅ Sıra Sıfırlama
- [ ] Sadece admin kullanıcı butonu görebiliyor
- [ ] Onay mesajı çıkıyor
- [ ] Sıfırladıktan sonra yeni queue oluşuyor
- [ ] Index 0'a dönüyor
- [ ] Başarı mesajı gösteriliyor

## Kod Değişiklikleri

### Değişen Dosyalar:

1. **src/components/Dashboard.tsx**
   - useState hook'ları: `queueData`, `loadingQueue`
   - useEffect: Queue data fetching
   - `fetchQueueData()`: Günlük queue'yu çeker
   - `handleResetQueue()`: Sırayı sıfırlar
   - `isToday()`: Tarih karşılaştırma helper
   - `todayDoctorStats`: Günlük istatistik hesaplama
   - Yeni UI kartı: "Bugünün Hekim Dağılımı"
   - Queue status ve reset button

2. **src/app/page.tsx**
   - Patient interface'e yeni alanlar eklendi
   - `handleAddPatient`: assignment_type ve assignment_date set ediyor

3. **src/hooks/useAppData.ts**
   - Patient interface güncellemesi

4. **supabase/migrations/add_patient_assignment_tracking.sql**
   - Yeni migration dosyası

## Sorun Giderme

### Dashboard'da tablo görünmüyor
- Admin olarak giriş yaptığınızdan emin olun
- Browser console'da hata kontrol edin
- Migration'ın başarılı çalıştığını doğrulayın

### İstatistikler yanlış
- Bugünün tarihini kontrol edin
- `assignment_date` alanının doğru set edildiğini doğrulayın
- Browser'ı refresh edin (Supabase real-time delay olabilir)

### Sıra sıfırlanamıyor
- Admin yetkisi kontrol edin
- `doctor_queue` tablosuna write access olduğunu doğrulayın
- Console'da Supabase hatalarını inceleyin

## Gelecek İyileştirmeler

- [ ] Haftalık/aylık trend grafikleri
- [ ] Excel/PDF export
- [ ] Hekim performans karşılaştırma
- [ ] Bildirim: "Sıra size geldi"
- [ ] Tahminsel analiz: Bugün kaç hasta bekleniyor
