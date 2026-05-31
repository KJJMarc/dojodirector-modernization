"use client";

import Link from "next/link";
import { clubAdminPath, KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

interface AttendanceCardToolbarProps {
  userId: string;
  year: number;
}

export function AttendanceCardToolbar({
  userId,
  year,
}: AttendanceCardToolbarProps) {
  const cardPath = `/students/${userId}/attendance-card`;

  return (
    <div className="attendance-card-toolbar flex flex-wrap items-center gap-2 print:hidden">
      <Link
        href={`${cardPath}?year=${year - 1}`}
        className="rounded-md border border-dojo-border bg-dojo-surface px-3 py-2 text-sm font-medium text-dojo-white hover:bg-dojo-elevated"
      >
        Previous Year
      </Link>
      <Link
        href={`${cardPath}?year=${year + 1}`}
        className="rounded-md border border-dojo-border bg-dojo-surface px-3 py-2 text-sm font-medium text-dojo-white hover:bg-dojo-elevated"
      >
        Next Year
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-dojo-red px-3 py-2 text-sm font-semibold text-dojo-white hover:bg-dojo-red-hover"
      >
        Print
      </button>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <Link
          href={clubAdminPath(KINGSTON_CLUB_SLUG)}
          className="text-sm font-medium text-dojo-muted hover:text-dojo-white"
        >
          Back to Admin Dashboard
        </Link>
        <Link
          href="/admin/students"
          className="text-sm font-medium text-dojo-muted hover:text-dojo-white"
        >
          Back to Students
        </Link>
        <Link
          href={`/admin/students/${userId}/profile`}
          className="text-sm font-medium text-dojo-muted hover:text-dojo-white"
        >
          Student Profile
        </Link>
      </div>
    </div>
  );
}
