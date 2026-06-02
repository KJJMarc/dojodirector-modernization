import {
  groupAttendanceSessionsByMonth,
} from "@/lib/attendance-schedule";
import { getAttendanceScheduleSessions } from "@/lib/attendance-schedule.server";
import { AttendanceRegisterBackLink } from "@/components/attendance/attendance-register-back-link";
import { AttendanceScheduleList } from "@/components/attendance/attendance-schedule-list";
import { AppHeader } from "@/components/layout/app-header";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
  parseAttendanceRegisterNavContext,
} from "@/lib/attendance-register-navigation.shared";
import { getClubBySlug } from "@/lib/clubs.server";
import { readSelectedInstructorPortalClubSlug } from "@/lib/instructor-portal-club.server";

export const dynamic = "force-dynamic";

interface AttendancePageProps {
  searchParams: { from?: string | string[]; club?: string | string[] };
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
  const sessions = await getAttendanceScheduleSessions(clubId);
  const monthGroups = groupAttendanceSessionsByMonth(sessions);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Attendance Register" />

      {navContext ? <AttendanceRegisterBackLink context={navContext} /> : null}

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Tap a session to mark
        attendance.
      </p>

      {monthGroups.length === 0 ? (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No sessions scheduled in the next 8 weeks.
        </section>
      ) : (
        <div className="space-y-6">
          {monthGroups.map((monthGroup) => (
            <AttendanceScheduleList
              key={monthGroup.monthKey}
              monthLabel={monthGroup.monthLabel}
              dateGroups={monthGroup.dateGroups}
              navContext={navContext}
            />
          ))}
        </div>
      )}
    </main>
  );
}
