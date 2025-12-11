# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Hakkında

Kurtbeyoğlu Diş Kliniği için geliştirilmiş modern bir PWA (Progressive Web App). Hasta takibi, tedavi yönetimi, randevu sistemi ve 4 rol bazlı yetkilendirme içerir.

**Roller**: `admin`, `doctor` (hekim), `banko` (resepsiyon), `asistan`

## Development Komutları

```bash
# Temel komutlar
npm install                    # Bağımlılıkları yükle
npm run dev                    # Development server (http://localhost:3000)
npm run build                  # Production build
npm start                      # Production server başlat

# Kalite kontrol
npm run lint                   # ESLint çalıştır
npx tsc --noEmit              # TypeScript tip kontrolü (test yok, bu kullanılır)

# Webpack modunda çalıştırma (PWA için gerekli)
npm run dev -- --webpack       # next.config.js'de zaten varsayılan
npm run build -- --webpack
```

**Not**: Bu projede test suite yok. Kod doğrulama için TypeScript ve ESLint kullanılır.

## Mimari Genel Bakış

### Teknik Stack
- **Framework**: Next.js 16.0.7 (App Router, React 19)
- **Database**: Supabase (PostgreSQL + Realtime subscriptions)
- **Styling**: Tailwind CSS v4
- **PWA**: next-pwa ile offline çalışma desteği
- **AI Entegrasyonu**: Google Gemini API (hasta notları için asistan)

### Dizin Yapısı

```
src/
├── app/
│   ├── page.tsx              # Ana uygulama (tüm mantık burada)
│   ├── layout.tsx            # Root layout (Theme, Toast providers)
│   └── api/chat/route.ts     # AI asistan API endpoint
├── components/
│   ├── Dashboard.tsx         # Admin istatistik paneli
│   ├── HelpModal.tsx         # Rol bazlı yardım sistemi
│   ├── TreatmentForm.tsx     # Tedavi ekleme formu + fiyat kataloğu
│   ├── AppointmentModal.tsx  # Randevu ekleme/düzenleme
│   ├── ReportExport.tsx      # PDF/CSV raporlama
│   ├── AIAssistant.tsx       # Gemini entegrasyonu
│   └── [diğerleri]           # Theme, Toast, Voice input vb.
├── hooks/
│   ├── useAppData.ts         # Merkezi data fetching ve real-time sync
│   ├── useTreatmentCatalog.ts # Tedavi fiyat kataloğu yönetimi
│   ├── useAppointments.ts    # Randevu CRUD operasyonları
│   └── [diğerleri]
└── lib/
    ├── supabase.ts           # Supabase client (singleton)
    ├── exportPdf.ts          # jsPDF ile rapor oluşturma
    └── exportCsv.ts          # CSV export utils
```

### Veri Akışı ve State Yönetimi

**Merkezi Hook: `useAppData()`**
- Tüm kullanıcı, hasta ve tedavi verilerini yönetir
- Supabase Realtime ile otomatik senkronizasyon (`postgres_changes`)
- Rol bazlı veri filtreleme (hekim sadece kendi hastalarını görür)

**Real-time Subscriptions:**
- `useAppData`: Ana tablo değişiklikleri (`doctors`, `patients`, `treatments`)
- `useTreatmentCatalog`: Tedavi fiyat kataloğu güncellemeleri
- `useAppointments`: Randevu değişiklikleri

**State Kaynağı Olarak Supabase**: React state Supabase'den türetilir, kaynak olarak kullanılmaz.

### Önemli Özellikler ve Mantıklar

#### 1. **Queue-Based Doctor Assignment (Akıllı Hekim Atama)**
- `doctor_queue` tablosu günlük sıra takibi yapar
- Banko görevlileri "Sıradaki Hekim" butonu ile dengeli dağılım sağlar
- Algoritma: Round-robin (sıradaki hekim assignment_type='queue' ile atanır)
- Manuel seçim de mümkün (assignment_type='preference')

#### 2. **Treatment Catalog (Tedavi Fiyat Kütüphanesi)**
- `treatment_catalog` tablosu: Standart fiyatlar ve kategoriler
- `useTreatmentCatalog` hook: Otomatik fiyat önerisi
- Yeni tedaviler otomatik olarak kataloğa eklenir
- İndirim hesaplama: `calculateDiscount()` fonksiyonu

#### 3. **Role-Based Permissions (Rol Bazlı Yetkiler)**
`hasPermission` helper objesi `src/app/page.tsx` içinde:

```typescript
const hasPermission = {
  viewAllPatients: (role) => role === 'admin' || role === 'banko' || role === 'asistan',
  editAnamnez: (role) => role === 'admin' || role === 'doctor' || role === 'asistan',
  deletePatient: (role) => role === 'admin' || role === 'doctor',
  addTreatment: (role) => role === 'admin' || role === 'doctor' || role === 'asistan',
  // ... vb.
}
```

**Önemli**: Veritabanı RLS politikaları şu an "Permissive" (tüm authenticated kullanıcılar okuma/yazma yapabilir). Production'da sıkılaştırılmalı!

#### 4. **PWA Yapılandırması**
- `next-pwa` ile offline çalışma
- Service Worker: Supabase isteklerini cache'ler (24 saat)
- `public/manifest.json`: PWA metadata
- `public/offline.html`: Fallback sayfası

#### 5. **AI Asistan Entegrasyonu**
- Google Gemini API (`@ai-sdk/google`)
- Hasta anamnez notları için akıllı öneriler
- Streaming responses (UI tarafında gösterilir)
- API Key: `GEMINI_API_KEY` environment variable (opsiyonel)

### Database Şeması (Kritik Tablolar)

**Core Tables:**
- `doctors`: Kullanıcılar (admin, hekim, banko, asistan)
- `patients`: Hastalar (doctor_id, assignment_type, assignment_date)
- `treatments`: Tedavi kayıtları (payment_status, payment_amount, notes)
- `appointments`: Randevular (date, status, patient_id, doctor_id)

**v2.0 Yeni Tablolar:**
- `doctor_queue`: Günlük hekim sırası (queue_order, last_assigned_at)
- `treatment_catalog`: Fiyat kütüphanesi (name UNIQUE, standard_price)
- `password_change_log`: Şifre değişiklik takibi (user_id, changed_by_user_id)
- `patient_images`: Hasta röntgen/fotoğraf arşivi (storage path, film_type)

**Storage Buckets:**
- `patient-images`: Hasta filmleri (Authenticated users only, max 10MB)

**Migration**: `migrations/initial_setup.sql` dosyası Supabase SQL Editor'de çalıştırılmalı.

## Environment Variables

`.env.local` dosyası oluşturun:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key  # Opsiyonel (AI asistan için)
```

**Önemli**: `supabase.ts` eksik env varlarında placeholder kullanır (build crash'i önlemek için). Gerçek kullanımda mutlaka doğru değerler gerekli.

## Code Patterns ve Conventions

### TypeScript
- Strict mode aktif (`tsconfig.json`)
- `any` kullanımından kaçının
- Type definitions genellikle dosya başında inline tanımlı (örnek: `src/app/page.tsx`)
- Shared types için `useAppData.ts` ve `useTreatmentCatalog.ts` referans alınabilir

### Component Patterns
- **Client Components**: Tüm interaktif UI client component (`'use client'`)
- **Utility Class Helper**: `cn()` fonksiyonu (clsx + twMerge) sıklıkla kullanılır
- **Real-time Hooks**: Her önemli veri için custom hook (`useAppData`, `useTreatmentCatalog` vb.)

### Styling
- Tailwind CSS v4 (PostCSS plugin sistemi)
- Dark mode: CSS variables + `ThemeProvider` (`useTheme` hook)
- Responsive design: Mobile-first yaklaşım

### Error Handling
- `useToast` hook ile kullanıcı bilgilendirmeleri
- `console.error` ile kritik hatalar loglanır (production'da monitoring eklenebilir)
- Supabase hataları try-catch ile yakalanır ve kullanıcıya gösterilir

## Debugging ve Troubleshooting

### Common Issues

1. **Supabase bağlantı hatası**: `.env.local` kontrol edin, RLS politikalarını gözden geçirin
2. **TypeScript errors**: `npx tsc --noEmit` ile tüm projeyi kontrol edin
3. **PWA cache sorunları**: DevTools > Application > Clear Storage (development'ta cache devre dışı)
4. **Real-time sync çalışmıyor**: Supabase Realtime'ın aktif olduğunu kontrol edin (Dashboard > Settings)

### Development Tips

- **Hot Reload**: Next.js dev server otomatik yenileme yapar, ancak bazen manual refresh gerekebilir
- **Supabase Client**: Singleton pattern kullanılır, her component'te yeniden oluşturulmaz
- **Component Tree**: `src/app/page.tsx` tek bir büyük component (SPA tarzı). Refactor yapılacaksa önce alt component'lere bölmek iyi olur.

## Yardım ve Dokümantasyon

**Son kullanıcılar için**: Uygulama içinde sağ alt köşede "?" (Yardım) butonu.

**Geliştiriciler için**:
- Bu dosya (CLAUDE.md)
- `migrations/initial_setup.sql` (database şeması)
- Supabase Dashboard (https://supabase.com/dashboard)

## Production Deployment Checklist

- [ ] `.env.local` → Production environment variables
- [ ] Supabase RLS politikalarını sıkılaştır (şu an permissive)
- [ ] `next.config.js`: PWA config gözden geçir (production'da disable=false olmalı)
- [ ] Error monitoring ekle (Sentry, Datadog vb.)
- [ ] Database backup stratejisi oluştur
- [ ] HTTPS zorla (Supabase ve Next.js deployment platformu varsayılan olarak sağlar)
- [ ] `GEMINI_API_KEY` güvenliğini sağla (backend API route'dan kullan, client'ta expose etme)
