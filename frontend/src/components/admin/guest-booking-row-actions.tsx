"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  cancelGuestBookingAction,
  deleteGuestBookingAction,
} from "@/app/admin/[clubSlug]/guest-bookings/actions";
import {
  ADMIN_TABLE_ACTION_BUTTON_CLASS,
  ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS,
} from "@/components/admin/admin-table-row-action-styles";

interface GuestBookingRowActionsProps {
  clubSlug: string;
  bookingId: string;
  guestName: string;
  bookingStatus: string;
}

export function GuestBookingRowActions({
  clubSlug,
  bookingId,
  guestName,
  bookingStatus,
}: GuestBookingRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCancelled = bookingStatus.trim().toLowerCase() === "cancelled";

  const submitCancel = () => {
    const confirmed = window.confirm(
      `Cancel booking for ${guestName}?\n\nTheir status will be set to Cancelled and they will be removed from future class registers.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await cancelGuestBookingAction({ clubSlug, bookingId });
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Unable to cancel booking.",
        );
      }
    });
  };

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
    <div className="inline-flex max-w-full flex-row flex-nowrap items-center gap-1">
      <button
        type="button"
        onClick={submitCancel}
        disabled={isPending || isCancelled}
        className={ADMIN_TABLE_ACTION_BUTTON_CLASS}
      >
        {isPending ? "Working…" : "Cancel Booking"}
      </button>
      <button
        type="button"
        onClick={submitDelete}
        disabled={isPending}
        className={ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS}
      >
        {isPending ? "Working…" : "Delete Booking"}
      </button>
    </div>
  );
}
