import type { Metadata } from "next";
import {
  ATTENDANCE_TIME_DISPLAY_FIX_VERSION,
  groupAttendanceSessionsByMonth,
  prioritizeTodayAttendanceMonthGroups,
} from "@/lib/attendance-schedule";
import { getAttendanceScheduleSessions } from "@/lib/attendance-schedule.server";
import { AttendanceRegisterBackLink } from "@/components/attendance/attendance-register-back-link";
import { AttendanceSessionScheduleSections } from "@/components/attendance/attendance-session-schedule-sections";
import { AppHeader } from "@/components/layout/app-header";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
  ATTENDANCE_SESSION_LIST_MODE,
} from "@/lib/attendance-register-navigation.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";

export const dynamic = "force-dynamic";

interface InstructorPortalAttendanceKioskPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: InstructorPortalAttendanceKioskPageProps): Promise<Metadata> {
  const { club } = await requireInstructorPortalPageContext(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Attendance Kiosk`,
    description: `Choose a class session to open the self check-in kiosk at ${club.name}.`,
  };
}

export default async function InstructorPortalAttendanceKioskPage({
  params,
}: InstructorPortalAttendanceKioskPageProps) {
  const { club } = await requireInstructorPortalPageContext(params.clubSlug);
  const sessions = await getAttendanceScheduleSessions(club.id);
  const navContext = {
    from: ATTENDANCE_REGISTER_NAV_FROM.instructorPortal,
    clubSlug: club.slug,
    mode: ATTENDANCE_SESSION_LIST_MODE.kiosk,
  };
  const monthGroups = prioritizeTodayAttendanceMonthGroups(
    groupAttendanceSessionsByMonth(sessions),
  );

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5"
      data-attendance-time-fix={ATTENDANCE_TIME_DISPLAY_FIX_VERSION}
      data-attendance-page="kiosk-list"
    >
      <AppHeader pageTitle="Attendance Kiosk" clubName={club.name} />

      <AttendanceRegisterBackLink context={navContext} />

      <p className="text-sm text-dojo-muted">
        Today&apos;s classes are shown first. Tap a session to open the self
        check-in kiosk.
      </p>

      <AttendanceSessionScheduleSections
        monthGroups={monthGroups}
        navContext={navContext}
      />
    </main>
  );
}
