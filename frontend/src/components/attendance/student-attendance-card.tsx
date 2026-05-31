"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AttendanceStatus } from "@/types/database";

interface StudentAttendanceCardProps {
  attendeeId: string;
  userId: string;
  studentName: string;
  status: AttendanceStatus;
  markAttendanceAction: (formData: FormData) => Promise<void>;
  markingDisabled?: boolean;
}

export function StudentAttendanceCard({
  attendeeId,
  userId,
  studentName,
  status,
  markAttendanceAction,
  markingDisabled = false,
}: StudentAttendanceCardProps) {
  const [isPending, startTransition] = useTransition();

  const submitWithStatus = (
    nextStatus: "present" | "absent" | "not_marked",
  ) => {
    if (markingDisabled) {
      return;
    }

    const formData = new FormData();
    formData.set("attendeeId", attendeeId);
    formData.set("attendanceStatus", nextStatus);
    startTransition(async () => {
      await markAttendanceAction(formData);
    });
  };

  const isPresent = status === "present";
  const isAbsent = status === "absent";
  const isUnmarked = !isPresent && !isAbsent;

  return (
    <article
      className={`flex items-center gap-2 rounded-lg border border-dojo-border bg-dojo-surface px-2 py-1.5 ${
        isPending || markingDisabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium leading-tight text-dojo-white">
          {studentName}
        </h3>
        <Link
          href={`/students/${userId}/attendance-card`}
          className="text-xs text-dojo-muted hover:text-dojo-red"
        >
          View Attendance Card
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => submitWithStatus("not_marked")}
          disabled={isPending || markingDisabled || isUnmarked}
          aria-label={`Clear ${studentName} attendance`}
          title="Clear attendance"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated text-sm font-semibold leading-none text-dojo-red transition hover:border-dojo-red/60 hover:bg-dojo-red/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span aria-hidden="true">✕</span>
        </button>
        <button
          type="button"
          onClick={() => submitWithStatus("present")}
          disabled={isPending || markingDisabled}
          aria-pressed={isPresent}
          aria-label={`Mark ${studentName} present`}
          className={`min-h-[36px] min-w-[4.25rem] rounded-md px-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            isPresent
              ? "bg-green-600 text-white ring-2 ring-green-400"
              : "border border-green-700/50 bg-dojo-elevated text-green-500 hover:bg-green-600/25"
          }`}
        >
          Present
        </button>
        <button
          type="button"
          onClick={() => submitWithStatus("absent")}
          disabled={isPending || markingDisabled}
          aria-pressed={isAbsent}
          aria-label={`Mark ${studentName} absent`}
          className={`min-h-[36px] min-w-[4.25rem] rounded-md px-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            isAbsent
              ? "bg-dojo-red text-dojo-white ring-2 ring-dojo-red-hover"
              : "border border-dojo-red/40 bg-dojo-elevated text-dojo-red hover:bg-dojo-red/25"
          }`}
        >
          Absent
        </button>
      </div>
    </article>
  );
}
