import Link from "next/link";
import { notFound } from "next/navigation";
import { markAttendance } from "@/app/attendance/actions";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { SessionAttendanceSection } from "@/components/attendance/session-attendance-section";
import { AppHeader } from "@/components/layout/app-header";
import {
  formatAttendanceCapacitySummary,
  formatAttendanceDayLabel,
  formatAttendanceTimeRange,
} from "@/lib/attendance-schedule";
import { getAttendanceSessionDetails } from "@/lib/attendance-session";
import { formatBookingDate, formatSessionLocation } from "@/lib/booking";
import { countAttendance } from "@/lib/attendance-ui";

export const dynamic = "force-dynamic";

interface AttendanceSessionPageProps {
  params: {
    sessionId: string;
  };
}

export default async function AttendanceSessionPage({
  params,
}: AttendanceSessionPageProps) {
  const details = await getAttendanceSessionDetails(params.sessionId);

  if (!details) {
    notFound();
  }

  const { session, endsAt, capacity, isCancelled, status } = details;
  const markingDisabled = isCancelled || status === "completed";
  const scheduleSession = {
    id: session.id,
    className: session.class_name,
    startsAt: session.starts_at,
    endsAt,
    location: session.location,
    capacity,
    bookedCount: session.session_attendees.length,
    spacesAvailable: null,
    status: details.status,
    isCancelled,
  };
  const counts = countAttendance(session.session_attendees);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle={session.class_name} />

      <Link
        href="/attendance"
        className="inline-flex text-sm text-dojo-muted hover:text-dojo-red"
      >
        ← Back to schedule
      </Link>

      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-dojo-white">
            {formatBookingDate(session.starts_at)}
          </p>
          <p className="text-sm text-dojo-muted">
            {formatAttendanceDayLabel(session.starts_at)}
          </p>
          <p className="text-sm text-dojo-muted">
            {formatAttendanceTimeRange(session.starts_at, endsAt)}
          </p>
          <p className="text-sm text-dojo-muted">
            {formatSessionLocation(session.location)}
          </p>
          <p className="text-xs font-medium text-dojo-muted">
            {formatAttendanceCapacitySummary(scheduleSession)}
          </p>
          {isCancelled ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-dojo-red">
              Cancelled
            </p>
          ) : null}
          {status === "completed" ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Completed
            </p>
          ) : null}
        </div>
        <div className="mt-3">
          <AttendanceSummary counts={counts} compact />
        </div>
      </section>

      {session.session_attendees.length === 0 ? (
        <section className="rounded-xl border border-dashed border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No students booked for this session yet.
        </section>
      ) : (
        <>
          {markingDisabled ? (
            <p className="rounded-xl border border-dojo-red/30 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-red">
              Attendance marking is disabled for {isCancelled ? "cancelled" : "completed"} sessions.
            </p>
          ) : null}
          <SessionAttendanceSection
            session={session}
            markAttendanceAction={markAttendance}
            markingDisabled={markingDisabled}
          />
        </>
      )}
    </main>
  );
}
