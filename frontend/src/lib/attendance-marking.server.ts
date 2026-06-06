import "server-only";

import { revalidateAttendanceImpactPaths } from "@/lib/admin-revalidate.server";
import { getClubSlugById } from "@/lib/attendance-card-manual.server";
import {
  syncAttendanceRecordForStatus,
  type SyncAttendanceStatus,
} from "@/lib/attendance-records-sync";
import { utcIsoToLondonDate } from "@/lib/london-datetime";
import { matchLeadOnTrialAttendance } from "@/lib/lead-status-tracking.server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SessionAttendeeMarkingRow {
  id: string;
  user_id: string | null;
  class_session_id: string;
  attendance_status: string | null;
}

interface ClassSessionMarkingRow {
  club_id: string;
  starts_at: string;
  status: string | null;
  classes: { name: string | null } | { name: string | null }[] | null;
}

async function loadSessionAttendeeForMarking(
  supabase: SupabaseClient,
  attendeeId: string,
): Promise<SessionAttendeeMarkingRow> {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, user_id, class_session_id, attendance_status")
    .eq("id", attendeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load session attendee: ${error.message}`);
  }

  if (!data) {
    throw new Error("Session attendee not found.");
  }

  return data as SessionAttendeeMarkingRow;
}

async function loadClassSessionForMarking(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ClassSessionMarkingRow> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("club_id, starts_at, status, classes(name)")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load class session for attendance: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  return data as ClassSessionMarkingRow;
}

function resolveClassName(classes: ClassSessionMarkingRow["classes"]) {
  const classRow = Array.isArray(classes) ? classes[0] : classes;
  return classRow?.name?.trim() || "Class";
}

export async function applySessionAttendeeAttendanceStatus(
  attendeeId: string,
  nextStatus: SyncAttendanceStatus,
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const attendee = await loadSessionAttendeeForMarking(supabase, attendeeId);
  const classSession = await loadClassSessionForMarking(
    supabase,
    attendee.class_session_id,
  );

  if (classSession.status === "cancelled") {
    throw new Error("Attendance cannot be marked for a cancelled session.");
  }

  if (classSession.status === "completed") {
    throw new Error("Attendance cannot be marked for a completed session.");
  }

  const { error } = await supabase
    .from("session_attendees")
    .update({ attendance_status: nextStatus })
    .eq("id", attendeeId);

  if (error) {
    throw new Error(`Unable to update attendance: ${error.message}`);
  }

  if (!attendee.user_id) {
    return attendee.class_session_id;
  }

  if (!classSession.club_id || !classSession.starts_at) {
    throw new Error("Unable to resolve class session details for attendance sync.");
  }

  const attendedOn = utcIsoToLondonDate(classSession.starts_at);

  await syncAttendanceRecordForStatus(
    supabase,
    {
      userId: attendee.user_id,
      clubId: classSession.club_id,
      classSessionId: attendee.class_session_id,
      attendedOn,
    },
    nextStatus,
  );

  if (nextStatus === "present") {
    const { data: userRow } = await supabase
      .from("users")
      .select("email, phone")
      .eq("id", attendee.user_id)
      .maybeSingle();

    const sessionDateLabel = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(classSession.starts_at));

    void matchLeadOnTrialAttendance({
      academyId: classSession.club_id,
      email: userRow?.email?.trim() ?? "",
      phone: userRow?.phone?.trim() ?? null,
      className: resolveClassName(classSession.classes),
      sessionDateLabel,
    });
  }

  const clubSlug = await getClubSlugById(classSession.club_id);
  revalidateAttendanceImpactPaths(clubSlug, attendee.user_id);

  return attendee.class_session_id;
}
