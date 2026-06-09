"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { deleteGuestBookingAction } from "@/app/admin/[clubSlug]/guest-bookings/actions";
import { ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS } from "@/components/admin/admin-table-row-action-styles";

interface GuestBookingRowActionsProps {
  clubSlug: string;
  bookingId: string;
}

const cancelButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

const confirmDeleteButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

export function GuestBookingRowActions({
  clubSlug,
  bookingId,
}: GuestBookingRowActionsProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeDialog = useCallback(() => {
    if (!isPending) {
      setIsDialogOpen(false);
      setErrorMessage(null);
    }
  }, [isPending]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeDialog, isDialogOpen]);

  const submitDelete = () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deleteGuestBookingAction({ clubSlug, bookingId });
        setIsDialogOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to delete booking.",
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={isPending}
        className={ADMIN_TABLE_DESTRUCTIVE_ACTION_BUTTON_CLASS}
      >
        {isPending ? "Working…" : "Delete Booking"}
      </button>

      {isDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-guest-booking-title"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-dojo-border bg-dojo-surface p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="delete-guest-booking-title"
              className="text-lg font-semibold text-dojo-white"
            >
              Delete guest booking?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
              This will permanently delete this guest booking and remove any linked
              training agreement PDF for this guest.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
              This action cannot be undone.
            </p>

            {errorMessage ? (
              <p className="mt-3 text-sm leading-snug text-dojo-red">{errorMessage}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className={cancelButtonClassName}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDelete}
                disabled={isPending}
                className={confirmDeleteButtonClassName}
              >
                {isPending ? "Deleting…" : "Delete guest booking"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
