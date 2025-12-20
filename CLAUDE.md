# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

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
```

## Mimari Genel Bakış

### Teknik Stack
- **Framework**: Next.js 16.0.7 (App Router, React 19)
- **Database**: Supabase (PostgreSQL + Realtime subscriptions)
- **Styling**: Tailwind CSS v4
- **Modularity**: Feature-based architecture (`src/features/`)

### Dizin Yapısı (Refactored)

```
src/
├── app/
│   ├── page.tsx              # Main Entry (Mobile/Desktop logic)
│   ├── layout.tsx            # Root layout
│   └── api/chat/route.ts     # AI asistan API
├── features/                 # Modular Feature Slices
│   ├── auth/                 # AuthProvider, Login, Password Modals
│   ├── doctors/              # Doctor Queue, Management
│   ├── patients/             # Patient List, Details, Provider
│   ├── treatments/           # Treatment Form, Catalog, Provider
│   ├── appointments/         # Agenda, Calendar Logic
│   └── payments/             # Payment Modals, Quick Access
├── components/               # Shared UI Components
│   ├── Dashboard.tsx         # Analytics
│   ├── CommandCenter.tsx     # Ctrl+K Search
│   └── [UI primitives]
├── lib/
│   ├── supabase.ts           # Client
│   └── types.ts              # Global Types
```

### Önemli Özellikler (Phase 1 & Phase 2 Completed)

#### 1. **Modular State Management**
Refactored monolithic `page.tsx` into Context Providers:
- `AuthProvider`: User session & role state.
- `PatientProvider`: Patient CRUD & Real-time sync.
- `TreatmentProvider`: Treatment logic.

#### 2. **Enhanced Features**
- **Feature 1: Agenda View**: Unified timeline/calendar for appointments.
- **Feature 2: Quick Payment**: Streamlined payment collection.
- **Feature 3: Financial Cards**: Live revenue metrics.
- **Feature 4: Phone Search**: Fuzzy search logic.
- **Feature 5: Treatment Reminders**: Automated follow-ups.
- **Feature 6: Photo Gallery**: Before/After comparison mode.
- **Feature 7: Packages**: Batch treatment application.
- **Feature 8: Duration Tracking**: Live procedure timers.
- **Feature 9: Status Colors**: Visual indicators (Red=Debt, Blue=Planned).
- **Feature 10: Quick Notes**: Persistent operational notes.

#### 3. **Visual Design**
- Premium "Teal & Gold" branding.
- Vector logo (Tooth/K concept).
- iPad-optimized responsiveness.

### Code Patterns

- **Suppression**: Some strictly typed errors are suppressed if functionality is verified (e.g., specific library types).
- **Utility First**: Use `getPatientStatus` in `features/patients/utils.ts` for logic shared between views.
- **Strict Mode**: TypeScript strict mode is ON.

## Production
- **Deployment**: Vercel (recommended) or Docker.
- **Env Vars**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

