"use client";

import Link from "next/link";

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
        Previous year
      </Link>
      <Link
        href={`${cardPath}?year=${year + 1}`}
        className="rounded-md border border-dojo-border bg-dojo-surface px-3 py-2 text-sm font-medium text-dojo-white hover:bg-dojo-elevated"
      >
        Next year
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
          href="/attendance"
          className="text-sm font-medium text-dojo-muted hover:text-dojo-white"
        >
          Back to register
        </Link>
        <Link
          href="/admin/students"
          className="text-sm font-medium text-dojo-muted hover:text-dojo-white"
        >
          Back to students
        </Link>
        <Link
          href={`/admin/students/${userId}/profile`}
          className="text-sm font-medium text-dojo-muted hover:text-dojo-white"
        >
          Student profile
        </Link>
      </div>
    </div>
  );
}
