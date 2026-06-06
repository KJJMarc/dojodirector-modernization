import Link from "next/link";
import {
  AttendanceScheduleSession,
  ATTENDANCE_TIME_DISPLAY_FIX_VERSION,
  formatAttendanceCapacitySummary,
  formatAttendanceSessionTimeRange,
  isAttendanceTimeDebugEnabled,
  resolveAttendanceSessionTimeSource,
} from "@/lib/attendance-schedule";
import { formatSessionLocation } from "@/lib/booking";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
  ATTENDANCE_SESSION_LIST_MODE,
  type AttendanceRegisterNavContext,
  withAttendanceRegisterNavContext,
} from "@/lib/attendance-register-navigation.shared";
import { instructorPortalAttendanceKioskPath } from "@/lib/instructor-portal-routing.shared";

interface AttendanceSessionRowProps {
  session: AttendanceScheduleSession;
  navContext?: AttendanceRegisterNavContext | null;
}

function SessionDetails({
  session,
}: {
  session: AttendanceScheduleSession;
}) {
  const timeLabel = formatAttendanceSessionTimeRange(session);
  const timeSource = resolveAttendanceSessionTimeSource(session);
  const showTimeDebug = isAttendanceTimeDebugEnabled();

  return (
    <div className="min-w-0 space-y-1">
      <h3 className="truncate text-base font-semibold text-dojo-white">
        {session.className}
      </h3>
      <p
        className="text-sm text-dojo-muted"
        data-attendance-time-fix={ATTENDANCE_TIME_DISPLAY_FIX_VERSION}
        data-attendance-time-source={timeSource}
        data-attendance-external-id={session.externalId ?? ""}
      >
        {timeLabel}
        {showTimeDebug ? (
          <span className="mt-0.5 block text-[10px] text-dojo-red">
            DEBUG time={timeLabel} source={timeSource} fix=
            {ATTENDANCE_TIME_DISPLAY_FIX_VERSION}
          </span>
        ) : null}
      </p>
      <p className="text-sm text-dojo-muted">
        {formatSessionLocation(session.location)}
      </p>
    </div>
  );
}

export function AttendanceSessionRow({
  session,
  navContext = null,
}: AttendanceSessionRowProps) {
  const registerHref = navContext
    ? withAttendanceRegisterNavContext(`/attendance/${session.id}`, navContext)
    : `/attendance/${session.id}`;

  const isInstructorPortalKioskList =
    navContext?.from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal &&
    navContext.mode === ATTENDANCE_SESSION_LIST_MODE.kiosk &&
    Boolean(navContext.clubSlug);

  if (isInstructorPortalKioskList && navContext?.clubSlug) {
    const kioskHref = instructorPortalAttendanceKioskPath(
      navContext.clubSlug,
      session.id,
    );

    return (
      <div
        className={`rounded-xl border bg-dojo-surface p-3 ${
          session.isCancelled
            ? "border-dojo-red/40 opacity-75"
            : "border-dojo-border"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <SessionDetails session={session} />
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-dojo-muted">
              {formatAttendanceCapacitySummary(session)}
            </p>
            {session.isCancelled ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-dojo-red">
                Cancelled
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <Link
            href={kioskHref}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover active:scale-[0.99]"
          >
            Open Kiosk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={registerHref}
      className={`block rounded-xl border bg-dojo-surface p-3 transition active:scale-[0.99] ${
        session.isCancelled
          ? "border-dojo-red/40 opacity-75"
          : "border-dojo-border hover:border-dojo-red/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <SessionDetails session={session} />
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-dojo-muted">
            {formatAttendanceCapacitySummary(session)}
          </p>
          {session.isCancelled ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-dojo-red">
              Cancelled
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
