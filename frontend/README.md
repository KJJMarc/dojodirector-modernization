# Kingston Jiu Jitsu Frontend (Attendance MVP)

Mobile-first Next.js 14 frontend for Kingston Jiu Jitsu instructor workflows.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase JavaScript client

## Environment Variables

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/attendance`.

## App Structure

```text
src/
  app/
    attendance/
      actions.ts              # Server action for attendance updates
      page.tsx                # Attendance register page
    layout.tsx
    page.tsx
  components/
    attendance/
      attendance-status-chip.tsx
      session-attendance-section.tsx
      student-attendance-card.tsx
  lib/
    attendance.ts             # Formatting + today range helpers
    supabase/
      client.ts               # Browser Supabase client
      server.ts               # Server-side Supabase client
  types/
    database.ts               # MVP TypeScript table row shapes
```

## Attendance Workflow MVP

- Loads **today's sessions** from `class_sessions`.
- Includes **booked attendees** from `session_attendees` linked to `users`.
- Shows each student as a large, touch-friendly card.
- One-tap **Present** / **Absent** actions update `session_attendees.attendance_status`.
- Updates are sent to Supabase directly so existing database automations continue to run.

## Scope

This MVP intentionally excludes:

- Authentication
- Payments
- Membership billing flows
