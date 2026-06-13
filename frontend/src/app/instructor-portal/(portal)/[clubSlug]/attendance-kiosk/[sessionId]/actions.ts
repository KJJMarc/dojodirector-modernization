"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import {
  kioskCheckInStudent,
} from "@/lib/attendance-kiosk.server";
import {
  ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE,
  type AttendanceKioskActionResult,
} from "@/lib/attendance-kiosk.shared";
import { getAttendanceSessionDetails } from "@/lib/attendance-session";
import { instructorPortalAttendanceRegisterPath } from "@/lib/attendance-register-navigation.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import { instructorPortalAttendanceKioskPath } from "@/lib/instructor-portal-routing.shared";

export type { AttendanceKioskActionResult } from "@/lib/attendance-kiosk.shared";

export async function kioskMarkPresentAction(
  formData: FormData,
): Promise<AttendanceKioskActionResult> {
  try {
    const clubSlug = String(formData.get("clubSlug") ?? "").trim();
    const sessionId = String(formData.get("sessionId") ?? "").trim();
    const userId = String(formData.get("userId") ?? "").trim();
    const confirmWalkIn = formData.get("confirmWalkIn") === "on";

    if (!clubSlug || !sessionId || !userId) {
      return { status: "error", message: ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE };
    }

    const { club } = await requireInstructorPortalPageContext(clubSlug);
    const details = await getAttendanceSessionDetails(sessionId);

    if (!details || details.clubId !== club.id) {
      notFound();
    }

    try {
      const result = await kioskCheckInStudent({
        sessionId,
        userId,
        clubId: club.id,
        classId: details.session.class_id,
        confirmWalkIn,
      });

      if (result.status === "marked_present") {
        revalidatePath(instructorPortalAttendanceRegisterPath(club.slug));
        revalidatePath(instructorPortalAttendanceKioskPath(club.slug, sessionId));
        revalidatePath(`/attendance/${sessionId}`);
        revalidatePath("/attendance");
      }

      return result;
    } catch {
      return { status: "error", message: ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE };
    }
  } catch {
    return { status: "error", message: ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE };
  }
}
