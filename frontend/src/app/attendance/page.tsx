import {
  ATTENDANCE_TIME_DISPLAY_FIX_VERSION,
  formatAttendanceScheduleFilterHeading,
  groupAttendanceSessionsByMonth,
  prioritizeTodayAttendanceMonthGroups,
  resolveAttendanceScheduleFilter,
} from "@/lib/attendance-schedule";
import { getAttendanceScheduleSessionsForFilter } from "@/lib/attendance-schedule.server";
import { AttendanceDateSearchForm } from "@/components/attendance/attendance-date-search-form";
import { AttendanceRegisterBackLink } from "@/components/attendance/attendance-register-back-link";
import { AttendanceSessionScheduleSections } from "@/components/attendance/attendance-session-schedule-sections";
import { AppHeader } from "@/components/layout/app-header";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
  parseAttendanceRegisterNavContext,
} from "@/lib/attendance-register-navigation.shared";
import { getClubBySlug } from "@/lib/clubs.server";
import { readSelectedInstructorPortalClubSlug } from "@/lib/instructor-portal-club.server";

export const dynamic = "force-dynamic";

interface AttendancePageProps {
  searchParams: {
    from?: string | string[];
    club?: string | string[];
    date?: string | string[];
    days?: string | string[];
  };
}

async function resolveAttendanceClubId(
  searchParams: AttendancePageProps["searchParams"],
): Promise<string | undefined> {
  const navContext = parseAttendanceRegisterNavContext(searchParams);

  if (!navContext) {
    return undefined;
  }

  if (navContext.from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal) {
    const clubSlug =
      navContext.clubSlug ?? (await readSelectedInstructorPortalClubSlug()) ?? undefined;

    if (!clubSlug) {
      return undefined;
    }

    const club = await getClubBySlug(clubSlug);
    return club?.id;
  }

  if (navContext.clubSlug) {
    const club = await getClubBySlug(navContext.clubSlug);
    return club?.id;
  }

  return undefined;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const navContext = parseAttendanceRegisterNavContext(searchParams);
  const clubId = await resolveAttendanceClubId(searchParams);
  const scheduleFilter = resolveAttendanceScheduleFilter(navContext);
  const sessions = await getAttendanceScheduleSessionsForFilter(scheduleFilter, clubId);
  const groupedSessions = groupAttendanceSessionsByMonth(sessions);
  const monthGroups =
    scheduleFilter.mode === "default" &&
    navContext?.from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal
      ? prioritizeTodayAttendanceMonthGroups(groupedSessions)
      : groupedSessions;
  const filterHeading = formatAttendanceScheduleFilterHeading(scheduleFilter);
  const emptyMessage =
    scheduleFilter.mode === "date-filter"
      ? "No sessions found for the selected date range."
      : "No sessions scheduled in the next 8 weeks.";

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5"
      data-attendance-time-fix={ATTENDANCE_TIME_DISPLAY_FIX_VERSION}
      data-attendance-page="register"
    >
      <AppHeader pageTitle="Attendance Register" />

      {navContext ? <AttendanceRegisterBackLink context={navContext} /> : null}

      {navContext ? (
        <AttendanceDateSearchForm
          navContext={navContext}
          initialDate={navContext.date}
          initialDays={navContext.days}
          filterHeading={filterHeading}
        />
      ) : null}

      {scheduleFilter.mode === "default" ? (
        <p className="text-sm text-dojo-muted">
          {navContext?.from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal
            ? "Today's classes are shown first. Tap a session to open the attendance register."
            : "Upcoming class sessions for the next 8 weeks. Tap a session to mark attendance."}
        </p>
      ) : null}

      <AttendanceSessionScheduleSections
        monthGroups={monthGroups}
        navContext={navContext}
        emptyMessage={emptyMessage}
      />
    </main>
  );
}
