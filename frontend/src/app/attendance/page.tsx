import { markAttendance } from "@/app/attendance/actions";
import { SessionAttendanceSection } from "@/components/attendance/session-attendance-section";
import { getTodayUtcRange, sortSessionsByTime } from "@/lib/attendance";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClassSession, UserProfile } from "@/types/database";

export const dynamic = "force-dynamic";

interface RawSessionAttendee {
  id: string;
  class_session_id: string;
  user_id: string;
  attendance_status: "present" | "absent" | null;
}

interface RawClassSession {
  id: string;
  class_id: string;
  starts_at: string;
  classes: { id: string; name: string } | { id: string; name: string }[] | null;
  session_attendees: RawSessionAttendee[];
}

async function getTodaysSessions() {
  const supabase = getSupabaseServerClient();
  const { startIso, endIso } = getTodayUtcRange();

  const { data: sessionRows, error } = await supabase
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
        attendance_status
      )
    `,
    )
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load today's sessions: ${error.message}`);
  }

  const rawSessions = (sessionRows ?? []) as RawClassSession[];
  const userIds = Array.from(
    new Set(
      rawSessions.flatMap((session) =>
        session.session_attendees.map((attendee) => attendee.user_id),
      ),
    ),
  );

  let usersById = new Map<string, UserProfile>();
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", userIds);

    if (usersError) {
      throw new Error(`Failed to load attendee users: ${usersError.message}`);
    }

    usersById = new Map((users ?? []).map((user) => [user.id, user as UserProfile]));
  }

  const sessions = rawSessions.map((session) => {
    const classRelation = Array.isArray(session.classes)
      ? session.classes[0] ?? null
      : session.classes ?? null;

    return {
      ...session,
      class_name: classRelation?.name ?? "Unnamed class",
      location: null,
      session_attendees: session.session_attendees.map((attendee) => ({
        ...attendee,
        users: usersById.get(attendee.user_id) ?? null,
      })),
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
        <p className="text-sm text-slate-300">Today&apos;s sessions and attendees</p>
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
