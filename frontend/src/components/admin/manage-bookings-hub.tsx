import Link from "next/link";
import { manageBookingsAttendanceRegisterPath } from "@/lib/attendance-register-navigation.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

interface ManageBookingsHubProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

export function ManageBookingsHub({ clubSlug }: ManageBookingsHubProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Link href={clubAdminPath(clubSlug, "bookings/make")} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Make Bookings</span>
        <span className="mt-1 text-xs text-dojo-muted">
          Block-book students and manage recurring class bookings
        </span>
      </Link>

      <Link
        href={clubAdminPath(clubSlug, "bookings/cancel")}
        className={actionCardClassName}
      >
        <span className="text-base font-semibold text-dojo-white">Cancel Bookings</span>
        <span className="mt-1 text-xs text-dojo-muted">
          View upcoming sessions and cancel student bookings
        </span>
      </Link>

      <Link
        href={manageBookingsAttendanceRegisterPath(clubSlug)}
        className={actionCardClassName}
      >
        <span className="text-base font-semibold text-dojo-white">
          Attendance Register
        </span>
        <span className="mt-1 text-xs text-dojo-muted">Mark today&apos;s attendance</span>
      </Link>
    </div>
  );
}
