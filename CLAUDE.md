# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DentistNote Pro - A dental clinic management system built with Next.js 16, React 19, TypeScript, and Supabase. The application provides patient management, treatment tracking, appointment scheduling, AI assistant (Gemini), and real-time data synchronization for dental practices.

**Turkish Language**: User-facing content is in Turkish (Türkçe). Code, comments, and technical documentation are in English.

## Development Commands

### Essential Commands
```bash
# Development server (uses webpack)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

### TypeScript
- TypeScript strict mode is enabled
- Path alias: `@/*` maps to `./src/*`
- Target: ES2017

## Architecture & Data Flow

### Core Architecture Pattern

The application uses a **centralized data fetching pattern** via the `useAppData` hook:

1. **Single Source of Truth**: `src/hooks/useAppData.ts` manages all application state (doctors, patients, treatments)
2. **Role-Based Data Filtering**: Privacy is enforced at the **frontend level** via PIN-based authentication
   - Admin users: see all patients
   - Doctor users: see only their own patients (filtered by `doctor_id`)
3. **Real-time Sync**: Supabase real-time subscriptions listen to database changes and trigger automatic refetches

### Data Flow
```
User Login (PIN)
  → useAppData.fetchData()
  → Supabase queries (filtered by role)
  → State updates (users, patients, treatments)
  → Real-time listener activates
  → UI re-renders on data changes
```

### Key Components

- **`src/app/page.tsx`**: Main application container with all views (patients, dashboard, appointments)
- **`src/hooks/useAppData.ts`**: Centralized data fetching and state management hook
- **`src/components/AIAssistant.tsx`**: Gemini AI chat interface using Vercel AI SDK
- **`src/components/Dashboard.tsx`**: Analytics and statistics view
- **`src/components/AppointmentList.tsx`** & **`AppointmentModal.tsx`**: Appointment management
- **`src/components/ReportExport.tsx`**: PDF generation with jsPDF
- **`src/components/VoiceInput.tsx`**: Speech-to-text for treatment notes

### API Routes

- **`src/app/api/chat/route.ts`**: AI assistant backend with Gemini 2.0 Flash Lite
  - Implements tool calling for database queries (getDoctors, getPatients, getTotalIncome)
  - Uses `@ai-sdk/google` and Vercel AI SDK's `streamText`

## Supabase Configuration

### Database Tables
- `doctors`: User accounts with PIN authentication
- `patients`: Patient records with `doctor_id` foreign key
- `treatments`: Treatment records linked to patients
- `appointments`: Appointment scheduling

### Row Level Security (RLS)
**Important**: RLS is set to **permissive mode** (`USING (true)`) because the app uses PIN-based authentication, not Supabase Auth. Privacy filtering happens in the frontend by `doctor_id`.

### Real-time Subscriptions
Enabled on all tables via `supabase.channel()` in `useAppData.ts`. Changes trigger automatic data refetches.

## Environment Variables

Required environment variables (stored in `.env.local`, not committed):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
```

**Graceful Degradation**: If Supabase env vars are missing, `src/lib/supabase.ts` uses placeholders to prevent build crashes. The UI handles connection errors gracefully.

## PWA Configuration

The app is a Progressive Web App (PWA) configured via `next-pwa`:
- Service worker generated in `public/` directory
- Disabled in development mode
- Caches Supabase API calls with NetworkFirst strategy (24h TTL)
- Offline fallback: `public/offline.html`

## Styling & UI

- **Tailwind CSS 4**: Utility-first styling
- **Dark Mode**: Implemented via `ThemeProvider` and `useTheme` hook
- **Responsive Design**: Mobile-first with sidebar toggle for small screens
- **Icons**: Lucide React icons
- **Animations**: Framer Motion for UI transitions

## Code Conventions

### Component Structure
- Client components use `'use client'` directive
- Server components (API routes) use TypeScript with `// @ts-nocheck` where necessary for Vercel AI SDK compatibility
- All components use TypeScript interfaces for props

### State Management
- React hooks (`useState`, `useEffect`, `useMemo`)
- Custom hooks for shared logic (`useAppData`, `useAppointments`, `useToast`, `useTheme`)
- No external state management library (Redux, Zustand) - local state + custom hooks pattern

### Data Fetching Pattern
Always use the centralized `useAppData` hook instead of direct Supabase calls in components:
```typescript
// ✅ Good
const { patients, fetchData } = useAppData();

// ❌ Avoid
const { data } = await supabase.from('patients').select('*');
```

### Error Handling
- Database errors set `dbError` state (displayed to user)
- API errors return JSON responses with descriptive messages
- Toast notifications for user feedback via `useToast` hook

## Testing & Debugging

### Browser Testing
- Recommended: Chrome/Safari for PWA features
- Test mobile view: Responsive design is critical for clinic staff

### Debugging Database Issues
1. Check Supabase RLS policies (permissive mode required)
2. Verify real-time subscriptions are enabled on tables
3. Check browser console for Supabase connection errors
4. Use `fetchData()` to manually trigger data refresh

### Debugging AI Assistant
- Check `GOOGLE_GENERATIVE_AI_API_KEY` is set
- Monitor API route logs: `src/app/api/chat/route.ts`
- Tool calls logged in server console

## Common Development Tasks

### Adding a New Database Table
1. Create table in Supabase dashboard
2. Add RLS policy: `CREATE POLICY "Permissive Access" FOR ALL USING (true)`
3. Enable real-time: `alter publication supabase_realtime add table your_table`
4. Add TypeScript interface to `useAppData.ts`
5. Extend `fetchData()` function to query new table

### Adding AI Assistant Tools
In `src/app/api/chat/route.ts`:
```typescript
tools: {
  yourTool: tool({
    description: 'Description in Turkish',
    parameters: z.object({ /* zod schema */ }),
    execute: async ({ params }) => {
      // Query Supabase
      const { data } = await supabase.from('table').select('*');
      return data;
    }
  })
}
```

### Modifying User Roles
User roles are stored in `doctors.role` field:
- `'admin'`: Full access to all data
- `'doctor'`: Access only to own patients (filtered by `doctor_id`)

Update filtering logic in `useAppData.ts` → `fetchData()` function.

## Production Considerations

### Build Process
- Next.js uses webpack (forced via `--webpack` flag in package.json)
- Static optimization enabled for performance
- Environment variables must be set at build time

### Deployment
- Recommended: Vercel (seamless Next.js deployment)
- Ensure all env vars are set in deployment platform
- PWA assets generated at build time in `public/`

### Performance
- Real-time subscriptions can cause high re-render frequency
- Consider debouncing updates if performance issues arise
- Treatments are fetched only for visible patients (optimization)

## Known Limitations

1. **No Backend Authentication**: PIN-based auth is client-side only. All users share the same Supabase anon key.
2. **Frontend Privacy**: Data filtering by `doctor_id` happens in frontend, not enforced by database RLS.
3. **No User Registration**: Doctors are added manually by admins through the UI.
4. **Single Clinic Scope**: No multi-tenant isolation (all data in one Supabase project).
