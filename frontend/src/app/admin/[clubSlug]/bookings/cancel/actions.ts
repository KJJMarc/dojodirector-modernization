"use server";

import { adminCancelSessionBookingPreserveAttendance } from "@/lib/admin-manage-bookings.server";
import { revalidateManageBookingsPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { createNextWaitlistOfferAfterCancellation } from "@/lib/session-waitlist.server";

export async function cancelManageBookingAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);

  const attendeeId = String(formData.get("attendeeId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!attendeeId) {
    throw new Error("Missing booking id.");
  }

  const result = await adminCancelSessionBookingPreserveAttendance(attendeeId);
  const resolvedSessionId = sessionId || result.sessionId;

  await createNextWaitlistOfferAfterCancellation({
    sessionId: resolvedSessionId,
    clubId: club.id,
    cancelledAttendeeId: attendeeId,
  });

  revalidateManageBookingsPaths(
    clubSlug,
    resolvedSessionId,
    userId || undefined,
  );
}
