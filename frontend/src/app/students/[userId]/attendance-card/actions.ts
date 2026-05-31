"use server";

import {
  BJJ_ATTENDANCE_CARD_MANUAL_SOURCES,
  BJJ_ATTENDANCE_CARD_MANUAL_SOURCE,
} from "@/lib/attendance-card-manual.shared";
import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";
import {
  formatAttendanceDateKey,
  isFutureAttendanceDate,
  isValidCalendarDate,
} from "@/lib/attendance-card-dates";
import { revalidateAttendanceImpactPaths } from "@/lib/admin-revalidate.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface ToggleManualAttendanceInput {
  userId: string;
  year: number;
  month: number;
  day: number;
  mode: "add" | "remove";
}

function parseToggleInput(formData: FormData): ToggleManualAttendanceInput {
  const userId = String(formData.get("userId") ?? "");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const day = Number(formData.get("day"));
  const mode = String(formData.get("mode") ?? "");

  if (!userId || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("Invalid attendance update payload.");
  }

  if (mode !== "add" && mode !== "remove") {
    throw new Error("Invalid attendance update mode.");
  }

  return { userId, year, month, day, mode };
}

function assertEditableAttendanceDate(
  year: number,
  month: number,
  day: number,
  mode: "add" | "remove",
) {
  if (!isValidCalendarDate(year, month, day)) {
    throw new Error("Invalid calendar date.");
  }

  const dateKey = formatAttendanceDateKey(year, month, day);

  if (mode === "add" && isFutureAttendanceDate(dateKey)) {
    throw new Error("Future dates cannot be marked manually.");
  }
}

async function assertStudentExists(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load student: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }
}

async function addManualAttendance(
  userId: string,
  clubId: string,
  attendedOn: string,
) {
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("attendance_records")
    .select("id, source")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("attended_on", attendedOn)
    .is("class_session_id", null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Unable to check attendance record: ${fetchError.message}`);
  }

  if (existing) {
    if (existing.source === BJJ_ATTENDANCE_CARD_MANUAL_SOURCE) {
      return;
    }

    const { error: updateError } = await supabase
      .from("attendance_records")
      .update({ source: BJJ_ATTENDANCE_CARD_MANUAL_SOURCE })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Unable to update attendance record: ${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from("attendance_records").insert({
    user_id: userId,
    club_id: clubId,
    class_session_id: null,
    attended_on: attendedOn,
    attended_at: new Date().toISOString(),
    source: BJJ_ATTENDANCE_CARD_MANUAL_SOURCE,
  });

  if (insertError) {
    throw new Error(`Unable to add attendance record: ${insertError.message}`);
  }
}

async function removeManualAttendanceForDate(
  userId: string,
  clubId: string,
  attendedOn: string,
) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("attended_on", attendedOn)
    .is("class_session_id", null)
    .in("source", [...BJJ_ATTENDANCE_CARD_MANUAL_SOURCES]);

  if (error) {
    throw new Error(`Unable to remove attendance record: ${error.message}`);
  }
}

export async function toggleManualAttendance(formData: FormData) {
  const input = parseToggleInput(formData);
  assertEditableAttendanceDate(input.year, input.month, input.day, input.mode);
  await assertStudentExists(input.userId);

  const { clubId, clubSlug } = await getStudentClubContextForAttendance(
    input.userId,
  );
  const attendedOn = formatAttendanceDateKey(input.year, input.month, input.day);

  if (input.mode === "add") {
    await addManualAttendance(input.userId, clubId, attendedOn);
  } else {
    await removeManualAttendanceForDate(input.userId, clubId, attendedOn);
  }

  revalidateAttendanceImpactPaths(clubSlug, input.userId);
}
