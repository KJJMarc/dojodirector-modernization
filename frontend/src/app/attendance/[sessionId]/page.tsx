import Link from "next/link";
import { notFound } from "next/navigation";
import { markAttendance } from "@/app/attendance/actions";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { SessionAttendanceSection } from "@/components/attendance/session-attendance-section";
import { AppHeader } from "@/components/layout/app-header";
import { getProgrammeAttendanceCardsEnabled } from "@/lib/admin-programmes.server";
import {
  formatAttendanceCapacitySummary,
  formatAttendanceDayLabel,
  formatAttendanceSessionTimeRange,
} from "@/lib/attendance-schedule";
import { getAttendanceSessionDetails } from "@/lib/attendance-session";
import { formatBookingDate, formatSessionLocation } from "@/lib/booking";
import { countAttendance } from "@/lib/attendance-ui";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
  attendanceRegisterPath,
  parseAttendanceRegisterNavContext,
} from "@/lib/attendance-register-navigation.shared";
import { getClubBySlug } from "@/lib/clubs.server";
import { readSelectedInstructorPortalClubSlug } from "@/lib/instructor-portal-club.server";

export const dynamic = "force-dynamic";

interface AttendanceSessionPageProps {
  params: {
    sessionId: string;
  };
  searchParams: {
    from?: string | string[];
    club?: string | string[];
    date?: string | string[];
    days?: string | string[];
  };
}

export default async function AttendanceSessionPage({
  params,
  searchParams,
}: AttendanceSessionPageProps) {
  const details = await getAttendanceSessionDetails(params.sessionId);

  if (!details) {
    notFound();
  }

  const { session, endsAt, externalId, capacity, isCancelled, status, clubId, programmeType } =
    details;
  const navContext = parseAttendanceRegisterNavContext(searchParams);

  if (navContext?.from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal) {
    const clubSlug =
      navContext.clubSlug ?? (await readSelectedInstructorPortalClubSlug()) ?? undefined;
    const expectedClub = clubSlug ? await getClubBySlug(clubSlug) : null;

    if (!expectedClub || expectedClub.id !== clubId) {
      notFound();
    }
  }

  const showAttendanceCardLink = await getProgrammeAttendanceCardsEnabled(
    clubId,
    programmeType,
  );
  const markingDisabled = isCancelled;
  const scheduleSession = {
    id: session.id,
    classId: session.class_id,
    className: session.class_name,
    programmeId: null,
    startsAt: session.starts_at,
    endsAt,
    externalId,
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
        href={attendanceRegisterPath(navContext)}
        className="inline-flex text-sm text-dojo-muted hover:text-dojo-red"
      >
        ← Back to Attendance Register
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
            {formatAttendanceSessionTimeRange(scheduleSession)}
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
              Attendance marking is disabled for cancelled sessions.
            </p>
          ) : null}
          <SessionAttendanceSection
            session={session}
            endsAt={endsAt}
            externalId={externalId}
            markAttendanceAction={markAttendance}
            markingDisabled={markingDisabled}
            showAttendanceCardLink={showAttendanceCardLink}
          />
        </>
      )}
    </main>
  );
}
