import { markAttendance } from "@/app/attendance/actions";
import { SessionAttendanceSection } from "@/components/attendance/session-attendance-section";
import { getTodayUtcRange, sortSessionsByTime } from "@/lib/attendance";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClassSession } from "@/types/database";

export const dynamic = "force-dynamic";

async function getTodaysSessions() {
  const supabase = getSupabaseServerClient();
  const { startIso, endIso } = getTodayUtcRange();

  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      `
      id,
      class_id,
      starts_at,
      classes (
        id,
        name
      ),
      session_attendees (
        id,
        class_session_id,
        user_id,
        attendance_status,
        users (
          id,
          first_name,
          last_name
        )
      )
    `,
    )
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load today's sessions: ${error.message}`);
  }

  const sessions = ((data ?? []) as Partial<ClassSession>[]).map((session) => {
    const classRelation = Array.isArray(session.classes)
      ? session.classes[0] ?? null
      : session.classes ?? null;

    return {
      ...session,
      class_name: classRelation?.name ?? "Unnamed class",
      location: null,
    } as ClassSession;
  });

  return sortSessionsByTime(sessions);
}

export default async function AttendancePage() {
  const sessions = await getTodaysSessions();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-4 py-6 pb-16 sm:px-6">
      <header className="sticky top-0 z-10 -mx-4 border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">
          Kingston Jiu Jitsu
        </p>
        <h1 className="text-2xl font-semibold text-slate-100">
          Instructor Attendance Register
        </h1>
        <p className="text-sm text-slate-300">Today&apos;s sessions and students</p>
      </header>

      {sessions.length === 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-300">
          No sessions scheduled for today.
        </section>
      ) : (
        <div className="space-y-5">
          {sessions.map((session) => (
            <SessionAttendanceSection
              key={session.id}
              session={session}
              markAttendanceAction={markAttendance}
            />
          ))}
        </div>
      )}
    </main>
  );
}
