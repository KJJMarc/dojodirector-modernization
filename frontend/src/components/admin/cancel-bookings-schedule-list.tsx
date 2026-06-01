import { CancelBookingsSessionRow } from "@/components/admin/cancel-bookings-session-row";
import type { CancelBookingsSessionSummary } from "@/lib/admin-manage-bookings.shared";
import { formatBookingDate } from "@/lib/booking";
import { formatScheduleDayLabel } from "@/lib/class-session-schedule";
import { formatAttendanceMonthLabel } from "@/lib/attendance-schedule";

interface CancelBookingsDateGroup {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  sessions: CancelBookingsSessionSummary[];
}

interface CancelBookingsMonthGroup {
  monthKey: string;
  monthLabel: string;
  dateGroups: CancelBookingsDateGroup[];
}

function groupCancelBookingsSessionsByMonth(
  sessions: CancelBookingsSessionSummary[],
): CancelBookingsMonthGroup[] {
  const months = new Map<string, CancelBookingsMonthGroup>();

  for (const session of sessions) {
    const monthKey = new Date(session.startsAt).toISOString().slice(0, 7);

    if (!months.has(monthKey)) {
      months.set(monthKey, {
        monthKey,
        monthLabel: formatAttendanceMonthLabel(session.startsAt),
        dateGroups: [],
      });
    }

    const monthGroup = months.get(monthKey)!;
    const dateKey = new Date(session.startsAt).toISOString().slice(0, 10);
    let dateGroup = monthGroup.dateGroups.find((group) => group.dateKey === dateKey);

    if (!dateGroup) {
      dateGroup = {
        dateKey,
        dateLabel: formatBookingDate(session.startsAt),
        dayLabel: formatScheduleDayLabel(session.startsAt),
        sessions: [],
      };
      monthGroup.dateGroups.push(dateGroup);
    }

    dateGroup.sessions.push(session);
  }

  return Array.from(months.values());
}

interface CancelBookingsScheduleListProps {
  clubSlug: string;
  sessions: CancelBookingsSessionSummary[];
}

export function CancelBookingsScheduleList({
  clubSlug,
  sessions,
}: CancelBookingsScheduleListProps) {
  const monthGroups = groupCancelBookingsSessionsByMonth(sessions);

  if (monthGroups.length === 0) {
    return (
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
        No upcoming sessions in the next 8 weeks.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {monthGroups.map((monthGroup) => (
        <section key={monthGroup.monthKey} className="space-y-4">
          <h2 className="sticky top-[7.5rem] z-10 border-b border-dojo-border bg-dojo-black/95 py-2 text-sm font-semibold uppercase tracking-wide text-dojo-red backdrop-blur">
            {monthGroup.monthLabel}
          </h2>
          <div className="space-y-5">
            {monthGroup.dateGroups.map((group) => (
              <section key={group.dateKey} className="space-y-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-dojo-white">
                    {group.dateLabel}
                  </h3>
                  <p className="text-xs text-dojo-muted">{group.dayLabel}</p>
                </div>
                <div className="space-y-2">
                  {group.sessions.map((session) => (
                    <CancelBookingsSessionRow
                      key={session.id}
                      clubSlug={clubSlug}
                      session={session}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
