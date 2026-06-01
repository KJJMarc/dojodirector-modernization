import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";

interface ManageClassesHubProps {
  clubSlug: string;
}

const actionCardClassName =
  "flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-4 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]";

export function ManageClassesHub({ clubSlug }: ManageClassesHubProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href={clubAdminPath(clubSlug, "classes/edit")} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">
          Edit / Update Classes
        </span>
        <span className="mt-1 text-xs text-dojo-muted">
          Create and edit recurring classes, venues, times, capacity, and active
          status
        </span>
      </Link>

      <Link href={clubAdminPath(clubSlug, "bookings")} className={actionCardClassName}>
        <span className="text-base font-semibold text-dojo-white">Manage Bookings</span>
        <span className="mt-1 text-xs text-dojo-muted">
          Make block bookings, view sessions, and cancel student bookings
        </span>
      </Link>
    </div>
  );
}
