"use server";

import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { revalidateGuestBookingsPaths } from "@/lib/admin-revalidate.server";
import {
  cancelAdminGuestBooking,
  deleteAdminGuestBooking,
} from "@/lib/guest-booking.server";

export async function cancelGuestBookingAction(input: {
  clubSlug: string;
  bookingId: string;
}) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  const result = await cancelAdminGuestBooking({
    clubId: club.id,
    bookingId: input.bookingId,
  });

  revalidateGuestBookingsPaths(input.clubSlug, result.sessionId);
}

export async function deleteGuestBookingAction(input: {
  clubSlug: string;
  bookingId: string;
}) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  const result = await deleteAdminGuestBooking({
    clubId: club.id,
    bookingId: input.bookingId,
  });

  revalidateGuestBookingsPaths(input.clubSlug, result.sessionId);
}
