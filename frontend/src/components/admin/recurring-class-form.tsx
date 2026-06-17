"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRecurringClassAction } from "@/app/admin/[clubSlug]/classes/actions";
import { updateRecurringClassAction } from "@/app/admin/[clubSlug]/classes/recurring-schedule-actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  DAY_OF_WEEK_OPTIONS,
  resolveDefaultRecurringClassProgrammeType,
  type RecurringClassProgrammeOption,
  type RecurringClassScheduleRow,
} from "@/lib/admin-recurring-classes.shared";

interface RecurringClassFormProps {
  clubSlug: string;
  programmeOptions: RecurringClassProgrammeOption[];
  schedule?: RecurringClassScheduleRow;
  instructorLabel?: string | null;
}

export function RecurringClassForm({
  clubSlug,
  programmeOptions,
  schedule,
  instructorLabel,
}: RecurringClassFormProps) {
  const isEdit = Boolean(schedule);
  const defaultProgrammeType = resolveDefaultRecurringClassProgrammeType(
    programmeOptions,
    schedule?.programmeType,
  );
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("clubSlug", clubSlug);

    if (schedule) {
      formData.set("scheduleId", schedule.id);
    }

    startTransition(async () => {
      try {
        if (schedule) {
          const result = await updateRecurringClassAction(formData);
          setSuccessMessage(result.sessionSyncSummary);
          router.refresh();
          return;
        }

        await createRecurringClassAction(formData);
        router.push(clubAdminPath(clubSlug, "classes/edit"));
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : isEdit
              ? "Unable to update recurring class."
              : "Unable to create recurring class.",
        );
      }
    });
  };

  const fieldClassName =
    "mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none focus:border-dojo-red";

  const controlClassName =
    "mt-1 h-12 w-full rounded-lg border border-dojo-border bg-dojo-black px-4 text-base text-dojo-white outline-none focus:border-dojo-red";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMessage ? (
        <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-dojo-white">
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {errorMessage}
        </p>
      ) : null}

      {schedule ? (
        <input type="hidden" name="scheduleId" value={schedule.id} />
      ) : null}

      <div>
        <label htmlFor="className" className="text-sm font-medium text-dojo-white">
          Class name
        </label>
        <input
          id="className"
          name="className"
          type="text"
          required
          defaultValue={schedule?.className}
          className={fieldClassName}
          placeholder="All-Levels Jiu Jitsu"
        />
      </div>

      <div>
        <label
          htmlFor="programmeType"
          className="text-sm font-medium text-dojo-white"
        >
          Programme type
        </label>
        {programmeOptions.length === 0 ? (
          <p className="mt-1 rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-muted">
            No programmes are enabled for this academy yet. Add an active programme
            in Programme Management before creating recurring classes.
          </p>
        ) : (
          <select
            id="programmeType"
            name="programmeType"
            required
            defaultValue={defaultProgrammeType}
            className={fieldClassName}
          >
            {programmeOptions.map((programmeOption) => (
              <option
                key={programmeOption.programmeType}
                value={programmeOption.programmeType}
              >
                {programmeOption.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="w-full">
          <label htmlFor="dayOfWeek" className="text-sm font-medium text-dojo-white">
            Day of week
          </label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            required
            defaultValue={schedule?.dayOfWeek ?? 1}
            className={controlClassName}
          >
            {DAY_OF_WEEK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label htmlFor="capacity" className="text-sm font-medium text-dojo-white">
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={schedule?.capacity ?? 30}
            className={controlClassName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="w-full">
          <label htmlFor="startTime" className="text-sm font-medium text-dojo-white">
            Start time
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={schedule?.startTime}
            className={controlClassName}
          />
        </div>

        <div className="w-full">
          <label htmlFor="endTime" className="text-sm font-medium text-dojo-white">
            End time
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue={schedule?.endTime}
            className={controlClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="text-sm font-medium text-dojo-white">
          Venue / location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          defaultValue={schedule?.location}
          className={fieldClassName}
          placeholder="Tiffin Sports Centre"
        />
      </div>

      <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Instructor
        </p>
        <p className="mt-1 text-sm text-dojo-white">
          {instructorLabel ?? "Unassigned"}
        </p>
        <Link
          href={clubAdminPath(clubSlug, "instructors/classes")}
          className="mt-2 inline-block text-xs font-semibold text-dojo-muted transition hover:text-dojo-red"
        >
          Assign or change instructor
        </Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-dojo-white">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={schedule?.isActive ?? true}
          className="h-4 w-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red"
        />
        {isEdit ? "Active (generates future sessions)" : "Active by default"}
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || programmeOptions.length === 0}
          className="min-h-[40px] rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Create recurring class"}
        </button>
        <Link
          href={clubAdminPath(clubSlug, "classes/edit")}
          className="inline-flex min-h-[40px] items-center rounded-md border border-dojo-border px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-elevated"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
