import { sortSessionsByTime } from "@/lib/attendance";
import { getSessionLocationMap } from "@/lib/booking";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClassSession, UserProfile } from "@/types/database";

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

interface ClassSessionMetaRow {
  id: string;
  class_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
}

export interface AttendanceSessionDetails {
  session: ClassSession;
  endsAt: string | null;
  capacity: number | null;
  status: string | null;
  isCancelled: boolean;
}

function buildSessionFromRows(
  rows: AttendanceRegisterRow[],
  meta: ClassSessionMetaRow,
  location: string | null,
): ClassSession {
  const sessionId = meta.id;
  const sessionAttendees: ClassSession["session_attendees"] = [];

  for (const row of rows) {
    if (!row.user_id) {
      continue;
    }

    const user: UserProfile = {
      id: row.user_id,
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: row.email ?? null,
    };

    sessionAttendees.push({
      id: row.session_attendee_id ?? row.attendee_id ?? `${sessionId}-${row.user_id}`,
      class_session_id: sessionId,
      user_id: row.user_id,
      attendance_status: row.attendance_status,
      users: user,
    });
  }

  const classId = meta.class_id;
  const className =
    rows.find((row) => row.class_name)?.class_name ?? "Unnamed class";

  return {
    id: sessionId,
    class_id: classId,
    class_name: className,
    starts_at: meta.starts_at,
    location,
    classes: classId
      ? {
          id: classId,
          name: className,
        }
      : null,
    session_attendees: sessionAttendees,
  };
}

export async function getAttendanceSessionDetails(
  sessionId: string,
): Promise<AttendanceSessionDetails | null> {
  const supabase = getSupabaseServerClient();

  const { data: meta, error: metaError } = await supabase
    .from("class_sessions")
    .select("id, class_id, starts_at, ends_at, capacity, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (metaError) {
    throw new Error(`Failed to load class session: ${metaError.message}`);
  }

  if (!meta) {
    return null;
  }

  const classSessionMeta = meta as ClassSessionMetaRow;

  const [{ data: registerRows, error: registerError }, locationBySessionId] =
    await Promise.all([
      supabase
        .from("attendance_register_rows")
        .select("*")
        .eq("class_session_id", sessionId)
        .order("last_name", { ascending: true }),
      getSessionLocationMap([sessionId]),
    ]);

  if (registerError) {
    throw new Error(`Failed to load session attendees: ${registerError.message}`);
  }

  let rows = (registerRows ?? []) as AttendanceRegisterRow[];

  if (rows.length === 0) {
    const { data: classRow } = await supabase
      .from("classes")
      .select("id, name")
      .eq("id", classSessionMeta.class_id)
      .maybeSingle();

    const { data: attendeeRows, error: attendeesError } = await supabase
      .from("session_attendees")
      .select(
        `
        id,
        class_session_id,
        user_id,
        attendance_status,
        booking_status,
        users (
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq("class_session_id", sessionId)
      .in("booking_status", ["booked", "walk_in"])
      .order("booked_at", { ascending: true });

    if (attendeesError) {
      throw new Error(`Failed to load session attendees: ${attendeesError.message}`);
    }

    rows = (attendeeRows ?? []).map((attendee) => {
      const users = Array.isArray(attendee.users)
        ? attendee.users[0] ?? null
        : attendee.users;

      return {
        class_session_id: sessionId,
        class_id: classSessionMeta.class_id,
        class_name: classRow?.name ?? null,
        starts_at: classSessionMeta.starts_at,
        location: locationBySessionId.get(sessionId) ?? null,
        attendee_id: attendee.id,
        session_attendee_id: attendee.id,
        user_id: attendee.user_id,
        attendance_status: attendee.attendance_status as "present" | "absent" | null,
        first_name: users?.first_name ?? null,
        last_name: users?.last_name ?? null,
        email: users?.email ?? null,
      };
    });
  }

  const session = buildSessionFromRows(
    rows,
    classSessionMeta,
    locationBySessionId.get(sessionId) ?? rows[0]?.location ?? null,
  );

  const sorted = sortSessionsByTime([session]);

  return {
    session: sorted[0]!,
    endsAt: classSessionMeta.ends_at,
    capacity: classSessionMeta.capacity,
    status: classSessionMeta.status,
    isCancelled: classSessionMeta.status === "cancelled",
  };
}
