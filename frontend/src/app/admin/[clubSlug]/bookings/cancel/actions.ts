"use server";

import { adminCancelSessionBookingPreserveAttendance } from "@/lib/admin-manage-bookings.server";
import { revalidateManageBookingsPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function cancelManageBookingAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  await requireClubBySlug(clubSlug);

  const attendeeId = String(formData.get("attendeeId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!attendeeId) {
    throw new Error("Missing booking id.");
  }

  const result = await adminCancelSessionBookingPreserveAttendance(attendeeId);

  revalidateManageBookingsPaths(
    clubSlug,
    sessionId || result.sessionId,
    userId || undefined,
  );
}
