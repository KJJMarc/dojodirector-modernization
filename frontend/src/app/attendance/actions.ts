"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const VALID_STATUS = new Set(["present", "absent"]);

export async function markAttendance(formData: FormData) {
  const attendeeId = String(formData.get("attendeeId") ?? "");
  const attendanceStatus = String(formData.get("attendanceStatus") ?? "");

  if (!attendeeId || !VALID_STATUS.has(attendanceStatus)) {
    throw new Error("Invalid attendance update payload.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("session_attendees")
    .update({ attendance_status: attendanceStatus })
    .eq("id", attendeeId);

  if (error) {
    throw new Error(`Unable to update attendance: ${error.message}`);
  }

  revalidatePath("/attendance");
}
