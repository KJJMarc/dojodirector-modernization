"use client";

import Link from "next/link";

interface AttendanceCardToolbarProps {
  userId: string;
  year: number;
}

const yearNavButtonClassName =
  "inline-flex min-h-[30px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-2.5 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/40 hover:bg-dojo-elevated";

export function AttendanceCardToolbar({ userId, year }: AttendanceCardToolbarProps) {
  const cardPath = `/students/${userId}/attendance-card`;

  return (
    <div className="attendance-card-toolbar flex flex-wrap items-center gap-1.5 print:hidden">
      <Link href={`${cardPath}?year=${year - 1}`} className={yearNavButtonClassName}>
        Previous Year
      </Link>
      <Link href={`${cardPath}?year=${year + 1}`} className={yearNavButtonClassName}>
        Next Year
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-[30px] items-center justify-center rounded-md bg-dojo-red px-2.5 py-1 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
      >
        Print
      </button>
    </div>
  );
}
