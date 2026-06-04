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
  type AttendanceRegisterNavContext,
  withAttendanceRegisterNavContext,
} from "@/lib/attendance-register-navigation.shared";

interface AttendanceSessionRowProps {
  session: AttendanceScheduleSession;
  navContext?: AttendanceRegisterNavContext | null;
}

export function AttendanceSessionRow({
  session,
  navContext = null,
}: AttendanceSessionRowProps) {
  const timeLabel = formatAttendanceSessionTimeRange(session);
  const timeSource = resolveAttendanceSessionTimeSource(session);
  const showTimeDebug = isAttendanceTimeDebugEnabled();

  const sessionHref = navContext
    ? withAttendanceRegisterNavContext(`/attendance/${session.id}`, navContext)
    : `/attendance/${session.id}`;

  return (
    <Link
      href={sessionHref}
      className={`block rounded-xl border bg-dojo-surface p-3 transition active:scale-[0.99] ${
        session.isCancelled
          ? "border-dojo-red/40 opacity-75"
          : "border-dojo-border hover:border-dojo-red/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
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
