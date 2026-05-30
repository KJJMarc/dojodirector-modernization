"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  deactivateRecurringClassAction,
  reactivateRecurringClassAction,
} from "@/app/admin/classes/recurring-schedule-actions";
import {
  formatDayOfWeekLabel,
  formatProgrammeTypeLabel,
  formatScheduleTimeLabel,
  type RecurringClassScheduleRow,
} from "@/lib/admin-recurring-classes.shared";
import {
  RECURRING_ACTION_LINK_CLASS,
  RECURRING_DESTRUCTIVE_BUTTON_CLASS,
  RECURRING_REACTIVATE_BUTTON_CLASS,
} from "@/components/admin/recurring-class-action-styles";

interface RecurringClassesListProps {
  schedules: RecurringClassScheduleRow[];
}

function ScheduleStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        isActive
          ? "bg-green-500/15 text-green-400"
          : "bg-neutral-500/15 text-neutral-400"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function ScheduleActions({ schedule }: { schedule: RecurringClassScheduleRow }) {
  const [isPending, startTransition] = useTransition();

  const submitAction = (action: (formData: FormData) => Promise<void>) => {
    const formData = new FormData();
    formData.set("scheduleId", schedule.id);

    startTransition(async () => {
      await action(formData);
    });
  };

  if (!schedule.isActive) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href={`/admin/classes/recurring/${schedule.id}/bookings`}
          className={RECURRING_ACTION_LINK_CLASS}
        >
          Manage Bookings
        </Link>

        <button
          type="button"
          disabled={isPending}
          onClick={() => submitAction(reactivateRecurringClassAction)}
          aria-label={`Reactivate ${schedule.className} on ${formatDayOfWeekLabel(schedule.dayOfWeek)}`}
          className={RECURRING_REACTIVATE_BUTTON_CLASS}
        >
          {isPending ? "Working…" : "Reactivate"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/admin/classes/recurring/${schedule.id}/bookings`}
        className={RECURRING_ACTION_LINK_CLASS}
      >
        Manage Bookings
      </Link>

      <div className="border-t border-dojo-border/70 pt-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submitAction(deactivateRecurringClassAction)}
          aria-label={`Deactivate ${schedule.className} on ${formatDayOfWeekLabel(schedule.dayOfWeek)}`}
          className={RECURRING_DESTRUCTIVE_BUTTON_CLASS}
        >
          {isPending ? "Working…" : "Deactivate"}
        </button>
      </div>
    </div>
  );
}

export function RecurringClassesList({ schedules }: RecurringClassesListProps) {
  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center">
        <p className="text-sm text-dojo-muted">
          No recurring classes yet. Add one to generate bookable sessions for the
          next 8 weeks.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-dojo-border md:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Programme</th>
              <th className="px-4 py-3 font-semibold">Day</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Capacity</th>
              <th className="px-4 py-3 font-semibold">Venue</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="min-w-[12rem] px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr
                key={schedule.id}
                className="border-b border-dojo-border/70 last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-dojo-white">
                  {schedule.className}
                </td>
                <td className="px-4 py-3 text-dojo-muted">
                  {formatProgrammeTypeLabel(schedule.programmeType)}
                </td>
                <td className="px-4 py-3 text-dojo-muted">
                  {formatDayOfWeekLabel(schedule.dayOfWeek)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-dojo-muted">
                  {formatScheduleTimeLabel(schedule.startTime)} –{" "}
                  {formatScheduleTimeLabel(schedule.endTime)}
                </td>
                <td className="px-4 py-3 text-dojo-muted">{schedule.capacity}</td>
                <td className="px-4 py-3 text-dojo-muted">{schedule.location}</td>
                <td className="px-4 py-3">
                  <ScheduleStatusBadge isActive={schedule.isActive} />
                </td>
                <td className="px-4 py-3 align-top">
                  <ScheduleActions schedule={schedule} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {schedules.map((schedule) => (
          <article
            key={schedule.id}
            className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-dojo-white">{schedule.className}</h3>
                <p className="mt-1 text-xs text-dojo-muted">
                  {formatProgrammeTypeLabel(schedule.programmeType)}
                </p>
              </div>
              <ScheduleStatusBadge isActive={schedule.isActive} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-dojo-muted">
              <div>
                <dt className="font-semibold uppercase tracking-wide">Day</dt>
                <dd className="mt-0.5 text-dojo-white">
                  {formatDayOfWeekLabel(schedule.dayOfWeek)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">Time</dt>
                <dd className="mt-0.5 text-dojo-white">
                  {formatScheduleTimeLabel(schedule.startTime)} –{" "}
                  {formatScheduleTimeLabel(schedule.endTime)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">Capacity</dt>
                <dd className="mt-0.5 text-dojo-white">{schedule.capacity}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">Venue</dt>
                <dd className="mt-0.5 text-dojo-white">{schedule.location}</dd>
              </div>
            </dl>
            <ScheduleActions schedule={schedule} />
          </article>
        ))}
      </div>
    </>
  );
}
