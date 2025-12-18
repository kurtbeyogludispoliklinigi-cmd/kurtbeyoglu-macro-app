---
trigger: always_on
---

# Kurtbeyoğlu Diş Kliniği - Agent Instructions

## Project Context
This is a PRODUCTION dental clinic management system built with Next.js 16 + Supabase. Currently used daily by doctors, receptionists, and staff.

## Mission
1. **PHASE 1 (Priority)**: Refactor technical debt
   - Break down 2376-line page.tsx into modular components
   - Modernize database management with Supabase CLI
   - Eliminate TypeScript `any` usage
   - Clean dead code

2. **PHASE 2**: Add 10 new features after Phase 1 is complete
   - Daily agenda view, quick payment, financial cards, etc.

## Critical Rules
⚠️ **NEVER break existing functionality** - this is in production
⚠️ **Test every change** - regression testing is mandatory
⚠️ **Incremental approach** - small commits, frequent tests
⚠️ **Ask before major decisions** - when uncertain, ask user

## MCP Tools Usage
- **Sequential Thinking**: Use for complex refactoring decisions, architectural planning, and problem-solving
- **Supabase**: Use for all database operations, migrations, and queries

## Code Standards
- Max 300 lines per component
- TypeScript strict mode
- Feature-based folder structure: `src/features/[domain]/`
- Commit format: `[type]: [description]` (e.g., "refactor: split page.tsx into modules")

## Project Structure
- Current: Single 2376-line page.tsx (BAD)
- Target: Modular features/ directory (GOOD)
- Database: Supabase PostgreSQL + Realtime
- Styling: Tailwind CSS v4
- Path: /Users/mydentor/Desktop/kurtbeyoglu-macro-app-1

## User Context
User is a dentist with ZERO coding knowledge. Explain technical decisions in simple terms when asking questions. Use Turkish for user-facing communication if needed.

## Success Criteria
✅ page.tsx < 300 lines
✅ All existing features working
✅ Zero TypeScript errors
✅ Modern migration system
✅ 10 new features added (Phase 2)