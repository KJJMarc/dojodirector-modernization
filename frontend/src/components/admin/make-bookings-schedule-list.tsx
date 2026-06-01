"use client";

import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  formatDayOfWeekLabel,
  formatProgrammeTypeLabel,
  formatScheduleTimeLabel,
  type RecurringClassScheduleRow,
} from "@/lib/admin-recurring-classes.shared";
import { RECURRING_ACTION_LINK_CLASS } from "@/components/admin/recurring-class-action-styles";

interface MakeBookingsScheduleListProps {
  clubSlug: string;
  schedules: RecurringClassScheduleRow[];
}

export function MakeBookingsScheduleList({
  clubSlug,
  schedules,
}: MakeBookingsScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center">
        <p className="text-sm text-dojo-muted">
          No recurring classes available. Add a recurring class first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {schedules.map((schedule) => (
        <article
          key={schedule.id}
          className="flex flex-col gap-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-dojo-white">{schedule.className}</h3>
            <p className="text-sm text-dojo-muted">
              {formatDayOfWeekLabel(schedule.dayOfWeek)} ·{" "}
              {formatScheduleTimeLabel(schedule.startTime)} –{" "}
              {formatScheduleTimeLabel(schedule.endTime)} · {schedule.location}
            </p>
            <p className="text-xs text-dojo-muted">
              {formatProgrammeTypeLabel(schedule.programmeType)} · Capacity{" "}
              {schedule.capacity}
              {!schedule.isActive ? " · Inactive" : ""}
            </p>
          </div>
          <Link
            href={clubAdminPath(clubSlug, `bookings/make/${schedule.id}`)}
            className={`${RECURRING_ACTION_LINK_CLASS} self-start sm:self-center`}
          >
            Make bookings
          </Link>
        </article>
      ))}
    </div>
  );
}
