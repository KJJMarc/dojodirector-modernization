"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteGuestBookingAction } from "@/app/admin/[clubSlug]/guest-bookings/actions";
import { ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS } from "@/components/admin/admin-table-row-action-styles";

interface GuestBookingRowActionsProps {
  clubSlug: string;
  bookingId: string;
  guestName: string;
}

export function GuestBookingRowActions({
  clubSlug,
  bookingId,
  guestName,
}: GuestBookingRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submitDelete = () => {
    const confirmed = window.confirm(
      `Permanently delete booking for ${guestName}?\n\nThis cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteGuestBookingAction({ clubSlug, bookingId });
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Unable to delete booking.",
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={submitDelete}
      disabled={isPending}
      className={ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS}
    >
      {isPending ? "Working…" : "Delete Booking"}
    </button>
  );
}
