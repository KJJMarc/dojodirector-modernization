import { sortByAttendanceRegisterName, sortSessionsByTime } from "@/lib/attendance";
import type { ProgrammeType } from "@/lib/admin-programme-types";
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
  club_id: string;
  starts_at: string;
  ends_at: string | null;
  external_id: string | null;
  capacity: number | null;
  status: string | null;
  classes: { programme_type: ProgrammeType } | { programme_type: ProgrammeType }[] | null;
}

export interface AttendanceSessionDetails {
  session: ClassSession;
  endsAt: string | null;
  externalId: string | null;
  capacity: number | null;
  status: string | null;
  isCancelled: boolean;
  clubId: string;
  programmeType: ProgrammeType;
}

interface SessionAttendeeRow {
  id: string;
  class_session_id: string;
  user_id: string;
  booking_status: string | null;
  attendance_status: string | null;
  notes: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

async function loadSessionAttendeeRegisterRows(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  sessionId: string,
  classSessionMeta: ClassSessionMetaRow,
  location: string | null,
): Promise<AttendanceRegisterRow[]> {
  const { data: classRow } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classSessionMeta.class_id)
    .maybeSingle();

  const { data: attendeeRows, error: attendeesError } = await supabase
    .from("session_attendees")
    .select(
      "id, class_session_id, user_id, booking_status, attendance_status, notes",
    )
    .eq("class_session_id", sessionId)
    .in("booking_status", ["booked", "walk_in"]);

  if (attendeesError) {
    throw new Error(`Failed to load session attendees: ${attendeesError.message}`);
  }

  const attendees = (attendeeRows ?? []) as SessionAttendeeRow[];

  if (attendees.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(attendees.map((attendee) => attendee.user_id)));

  const { data: userRows, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (usersError) {
    throw new Error(`Failed to load attendee profiles: ${usersError.message}`);
  }

  const userById = new Map(
    ((userRows ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  const rows: AttendanceRegisterRow[] = attendees.map((attendee) => {
    const user = userById.get(attendee.user_id);
    const attendanceStatus: AttendanceRegisterRow["attendance_status"] =
      attendee.attendance_status === "present" ||
      attendee.attendance_status === "absent"
        ? attendee.attendance_status
        : null;

    return {
      class_session_id: sessionId,
      class_id: classSessionMeta.class_id,
      class_name: classRow?.name ?? null,
      starts_at: classSessionMeta.starts_at,
      location,
      attendee_id: attendee.id,
      session_attendee_id: attendee.id,
      user_id: attendee.user_id,
      attendance_status: attendanceStatus,
      first_name: user?.first_name ?? null,
      last_name: user?.last_name ?? null,
      email: user?.email ?? null,
    };
  });

  return sortByAttendanceRegisterName(rows, (row) => ({
    firstName: row.first_name,
    lastName: row.last_name,
  }));
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
    .select(
      "id, class_id, club_id, starts_at, ends_at, external_id, capacity, status, classes(programme_type)",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (metaError) {
    throw new Error(`Failed to load class session: ${metaError.message}`);
  }

  if (!meta) {
    return null;
  }

  const classSessionMeta = meta as ClassSessionMetaRow;
  const classRow = Array.isArray(classSessionMeta.classes)
    ? (classSessionMeta.classes[0] ?? null)
    : classSessionMeta.classes;
  const programmeType = classRow?.programme_type ?? "bjj";
  const locationBySessionId = await getSessionLocationMap([sessionId]);

  const rows = await loadSessionAttendeeRegisterRows(
    supabase,
    sessionId,
    classSessionMeta,
    locationBySessionId.get(sessionId) ?? null,
  );

  const session = buildSessionFromRows(
    rows,
    classSessionMeta,
    locationBySessionId.get(sessionId) ?? rows[0]?.location ?? null,
  );

  const sorted = sortSessionsByTime([session]);

  return {
    session: sorted[0]!,
    endsAt: classSessionMeta.ends_at,
    externalId: classSessionMeta.external_id,
    capacity: classSessionMeta.capacity,
    status: classSessionMeta.status,
    isCancelled: classSessionMeta.status === "cancelled",
    clubId: classSessionMeta.club_id,
    programmeType,
  };
}
