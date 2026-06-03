import Link from "next/link";
import type { CancelBookingsSessionSummary } from "@/lib/admin-manage-bookings.shared";
import { formatSessionLocation } from "@/lib/booking";
import { clubAdminPath } from "@/lib/clubs.shared";

function formatBookedCapacitySummary(session: CancelBookingsSessionSummary) {
  if (session.capacity === null) {
    return `${session.bookedCount} booked`;
  }

  return `${session.bookedCount} / ${session.capacity} booked`;
}

interface CancelBookingsSessionRowProps {
  clubSlug: string;
  session: CancelBookingsSessionSummary;
}

export function CancelBookingsSessionRow({
  clubSlug,
  session,
}: CancelBookingsSessionRowProps) {
  return (
    <Link
      href={clubAdminPath(clubSlug, `bookings/cancel/${session.id}`)}
      className="block rounded-xl border border-dojo-border bg-dojo-surface p-3 transition hover:border-dojo-red/50 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-base font-semibold text-dojo-white">
            {session.className}
          </h3>
          <p className="text-sm text-dojo-muted">{session.dateLabel}</p>
          <p className="text-sm text-dojo-muted">{session.timeLabel}</p>
          <p className="text-sm text-dojo-muted">
            {formatSessionLocation(session.location)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-dojo-muted">
            {formatBookedCapacitySummary(session)}
          </p>
        </div>
      </div>
    </Link>
  );
}
