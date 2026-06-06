"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import {
  kioskCheckInStudent,
} from "@/lib/attendance-kiosk.server";
import type { AttendanceKioskCheckInResult } from "@/lib/attendance-kiosk.shared";
import { getAttendanceSessionDetails } from "@/lib/attendance-session";
import { instructorPortalAttendanceRegisterPath } from "@/lib/attendance-register-navigation.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import { instructorPortalAttendanceKioskPath } from "@/lib/instructor-portal-routing.shared";

export async function kioskMarkPresentAction(
  formData: FormData,
): Promise<AttendanceKioskCheckInResult> {
  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!clubSlug || !sessionId || !userId) {
    throw new Error("Invalid kiosk check-in request.");
  }

  const { club } = await requireInstructorPortalPageContext(clubSlug);
  const details = await getAttendanceSessionDetails(sessionId);

  if (!details || details.clubId !== club.id) {
    notFound();
  }

  const result = await kioskCheckInStudent({
    sessionId,
    userId,
    clubId: club.id,
    classId: details.session.class_id,
  });

  revalidatePath(instructorPortalAttendanceRegisterPath(club.slug));
  revalidatePath(instructorPortalAttendanceKioskPath(club.slug, sessionId));
  revalidatePath(`/attendance/${sessionId}`);
  revalidatePath("/attendance");

  return result;
}
