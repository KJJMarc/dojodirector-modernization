import { markAttendance } from "@/app/attendance/actions";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { SessionAttendanceSection } from "@/components/attendance/session-attendance-section";
import { AppHeader } from "@/components/layout/app-header";
import {
  getAttendanceRegisterDateRange,
  sortSessionsByTime,
} from "@/lib/attendance";
import { countAttendance } from "@/lib/attendance-ui";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClassSession, UserProfile } from "@/types/database";

export const dynamic = "force-dynamic";

interface AttendanceRegisterRow {
  class_session_id: string;
  class_id: string | null;
  class_name: string | null;
  starts_at: string;
  location: string | null;
  attendee_id: string | null;
  session_attendee_id: string | null;
  user_id: string | null;
  attendance_status: "present" | "absent" | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface SessionAccumulator {
  id: string;
  class_id: string;
  class_name: string;
  starts_at: string;
  location: string | null;
  session_attendees: ClassSession["session_attendees"];
}

async function getTodaysSessions() {
  const supabase = getSupabaseServerClient();
  const { startIso, endIso } = getAttendanceRegisterDateRange();

  const { data, error } = await supabase
    .from("attendance_register_rows")
    .select("*")
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load sessions: ${error.message}`);
  }

  const rows = (data ?? []) as AttendanceRegisterRow[];
  const sessionsById = new Map<string, SessionAccumulator>();

  for (const row of rows) {
    const sessionId = row.class_session_id;
    if (!sessionId) {
      continue;
    }

    if (!sessionsById.has(sessionId)) {
      sessionsById.set(sessionId, {
        id: sessionId,
        class_id: row.class_id ?? "",
        class_name: row.class_name ?? "Unnamed class",
        starts_at: row.starts_at,
        location: row.location ?? null,
        session_attendees: [],
      });
    }

    const session = sessionsById.get(sessionId)!;
    if (!row.user_id) {
      continue;
    }

    const user: UserProfile = {
      id: row.user_id,
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: row.email ?? null,
    };

    session.session_attendees.push({
      id: row.session_attendee_id ?? row.attendee_id ?? `${sessionId}-${row.user_id}`,
      class_session_id: sessionId,
      user_id: row.user_id,
      attendance_status: row.attendance_status,
      users: user,
    });
  }

  const sessions = Array.from(sessionsById.values()).map(
    (session) =>
      ({
        ...session,
        classes: session.class_id
          ? {
              id: session.class_id,
              name: session.class_name,
            }
          : null,
      }) as ClassSession,
  );

  return sortSessionsByTime(sessions);
}

export default async function AttendancePage() {
  const sessions = await getTodaysSessions();
  const pageCounts = countAttendance(
    sessions.flatMap((session) => session.session_attendees),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Attendance Register" />

      {sessions.length === 0 ? (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No sessions found.
        </section>
      ) : (
        <div className="space-y-4">
          <AttendanceSummary counts={pageCounts} />
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
