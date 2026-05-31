"use server";

import { headers } from "next/headers";
import { requireClubBySlug } from "@/lib/clubs.server";
import { submitGuestBooking as persistGuestBooking } from "@/lib/guest-booking.server";
import {
  parseGuestBookingSubmission,
  type GuestBookingResult,
  type GuestBookingSubmission,
} from "@/lib/guest-booking.shared";

export type { GuestBookingResult };

export async function submitGuestBooking(
  clubSlug: string,
  input: GuestBookingSubmission,
): Promise<GuestBookingResult> {
  const club = await requireClubBySlug(clubSlug);
  const headerStore = await headers();
  const submission = parseGuestBookingSubmission(input);

  return persistGuestBooking(submission, {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
    expectedClubId: club.id,
  });
}
