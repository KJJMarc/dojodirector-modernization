"use server";

import { revalidatePath } from "next/cache";
import { revalidateAttendanceImpactPaths } from "@/lib/admin-revalidate.server";
import { getClubSlugById } from "@/lib/attendance-card-manual.server";
import { syncAttendanceRecordForStatus } from "@/lib/attendance-records-sync";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const VALID_STATUS = new Set(["present", "absent"]);

interface SessionAttendeeMarkingRow {
  id: string;
  user_id: string | null;
  class_session_id: string;
}

async function getSessionAttendeeForMarking(attendeeId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, user_id, class_session_id")
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

export async function markAttendance(formData: FormData) {
  const attendeeId = String(formData.get("attendeeId") ?? "");
  const attendanceStatus = String(formData.get("attendanceStatus") ?? "");

  if (!attendeeId || !VALID_STATUS.has(attendanceStatus)) {
    throw new Error("Invalid attendance update payload.");
  }

  const supabase = getSupabaseServerClient();
  const attendee = await getSessionAttendeeForMarking(attendeeId);

  const { data: classSession, error: classSessionError } = await supabase
    .from("class_sessions")
    .select("club_id, starts_at, status")
    .eq("id", attendee.class_session_id)
    .maybeSingle();

  if (classSessionError) {
    throw new Error(
      `Unable to load class session for attendance: ${classSessionError.message}`,
    );
  }

  if (!classSession) {
    throw new Error("Class session not found.");
  }

  if (classSession.status === "cancelled") {
    throw new Error("Attendance cannot be marked for a cancelled session.");
  }

  if (classSession.status === "completed") {
    throw new Error("Attendance cannot be marked for a completed session.");
  }

  const { error } = await supabase
    .from("session_attendees")
    .update({ attendance_status: attendanceStatus })
    .eq("id", attendeeId);

  if (error) {
    throw new Error(`Unable to update attendance: ${error.message}`);
  }

  if (attendee.user_id) {
    if (!classSession.club_id || !classSession.starts_at) {
      throw new Error("Unable to resolve class session details for attendance sync.");
    }

    const attendedOn = new Date(classSession.starts_at).toISOString().slice(0, 10);

    await syncAttendanceRecordForStatus(
      supabase,
      {
        userId: attendee.user_id,
        clubId: classSession.club_id,
        classSessionId: attendee.class_session_id,
        attendedOn,
      },
      attendanceStatus as "present" | "absent",
    );

    const clubSlug = await getClubSlugById(classSession.club_id);
    revalidateAttendanceImpactPaths(clubSlug, attendee.user_id);
  }

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${attendee.class_session_id}`);
}
