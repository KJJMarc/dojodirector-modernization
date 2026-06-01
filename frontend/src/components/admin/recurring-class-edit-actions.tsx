"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deactivateRecurringClassAction,
  deleteRecurringClassAction,
  reactivateRecurringClassAction,
} from "@/app/admin/[clubSlug]/classes/recurring-schedule-actions";
import {
  RECURRING_DESTRUCTIVE_BUTTON_CLASS,
  RECURRING_HARD_DELETE_BUTTON_CLASS,
  RECURRING_REACTIVATE_BUTTON_CLASS,
} from "@/components/admin/recurring-class-action-styles";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  formatDayOfWeekLabel,
  type RecurringClassDeleteStatus,
  type RecurringClassScheduleRow,
} from "@/lib/admin-recurring-classes.shared";

interface RecurringClassEditActionsProps {
  clubSlug: string;
  schedule: RecurringClassScheduleRow;
  deleteStatus: RecurringClassDeleteStatus;
}

export function RecurringClassEditActions({
  clubSlug,
  schedule,
  deleteStatus,
}: RecurringClassEditActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitAction = (
    action: (formData: FormData) => Promise<void>,
    onSuccess?: () => void,
  ) => {
    setError(null);
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("scheduleId", schedule.id);

    startTransition(async () => {
      try {
        await action(formData);
        onSuccess?.();
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to complete this action.",
        );
      }
    });
  };

  const handleDeactivate = () => {
    const dayLabel = formatDayOfWeekLabel(schedule.dayOfWeek);
    const confirmed = window.confirm(
      `Deactivate ${schedule.className} (${dayLabel})?\n\nFuture scheduled sessions for this slot will be cancelled. Past attendance is kept.`,
    );

    if (!confirmed) {
      return;
    }

    submitAction(deactivateRecurringClassAction);
  };

  const handleReactivate = () => {
    const dayLabel = formatDayOfWeekLabel(schedule.dayOfWeek);
    const confirmed = window.confirm(
      `Reactivate ${schedule.className} (${dayLabel})?\n\nFuture sessions will be generated again.`,
    );

    if (!confirmed) {
      return;
    }

    submitAction(reactivateRecurringClassAction);
  };

  const handleDelete = () => {
    if (!deleteStatus.canDelete) {
      window.alert(deleteStatus.message);
      return;
    }

    const dayLabel = formatDayOfWeekLabel(schedule.dayOfWeek);
    const confirmed = window.confirm(
      `Permanently delete ${schedule.className} (${dayLabel})?\n\nThis cannot be undone. Future sessions and bookings for this slot will be removed.`,
    );

    if (!confirmed) {
      return;
    }

    const typed = window.prompt(
      'Type DELETE to confirm permanent removal of this recurring class.',
    );

    if (typed?.trim().toUpperCase() !== "DELETE") {
      return;
    }

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("scheduleId", schedule.id);

    startTransition(async () => {
      try {
        await deleteRecurringClassAction(formData);
        router.push(clubAdminPath(clubSlug, "classes/edit"));
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to delete recurring class.",
        );
      }
    });
  };

  return (
    <section
      className={`space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4 ${
        isPending ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Class actions
        </h3>
        <p className="mt-1 text-xs text-dojo-muted">
          Deactivate stops future sessions. Delete permanently removes the template
          when safe.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {error}
        </p>
      ) : null}

      {!deleteStatus.canDelete ? (
        <p className="rounded-md border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {deleteStatus.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {schedule.isActive ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDeactivate}
            className={`${RECURRING_DESTRUCTIVE_BUTTON_CLASS} min-h-[40px] min-w-[8.75rem] px-4`}
          >
            {isPending ? "Working…" : "Deactivate"}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={handleReactivate}
            className={`${RECURRING_REACTIVATE_BUTTON_CLASS} min-h-[40px] min-w-[8.75rem] px-4`}
          >
            {isPending ? "Working…" : "Reactivate"}
          </button>
        )}

        <button
          type="button"
          disabled={isPending || !deleteStatus.canDelete}
          onClick={handleDelete}
          className={`${RECURRING_HARD_DELETE_BUTTON_CLASS} min-h-[40px] min-w-[8.75rem] px-4`}
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </section>
  );
}
