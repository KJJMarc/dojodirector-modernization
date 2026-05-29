"use client";

import { useTransition } from "react";
import { AttendanceStatus } from "@/types/database";

interface StudentAttendanceCardProps {
  attendeeId: string;
  studentName: string;
  status: AttendanceStatus;
  markAttendanceAction: (formData: FormData) => Promise<void>;
}

export function StudentAttendanceCard({
  attendeeId,
  studentName,
  status,
  markAttendanceAction,
}: StudentAttendanceCardProps) {
  const [isPending, startTransition] = useTransition();

  const submitWithStatus = (nextStatus: "present" | "absent") => {
    const formData = new FormData();
    formData.set("attendeeId", attendeeId);
    formData.set("attendanceStatus", nextStatus);
    startTransition(async () => {
      await markAttendanceAction(formData);
    });
  };

  const isPresent = status === "present";
  const isAbsent = status === "absent";

  return (
    <article
      className={`flex items-center gap-2 rounded-lg border border-dojo-border bg-dojo-surface px-2 py-1.5 ${
        isPending ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium leading-tight text-dojo-white">
          {studentName}
        </h3>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => submitWithStatus("present")}
          disabled={isPending}
          aria-pressed={isPresent}
          aria-label={`Mark ${studentName} present`}
          className={`min-h-[36px] min-w-[4.25rem] rounded-md px-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            isPresent
              ? "bg-green-600 text-white ring-2 ring-green-400"
              : "bg-dojo-elevated text-dojo-muted hover:bg-green-600/20 hover:text-green-400"
          }`}
        >
          Present
        </button>
        <button
          type="button"
          onClick={() => submitWithStatus("absent")}
          disabled={isPending}
          aria-pressed={isAbsent}
          aria-label={`Mark ${studentName} absent`}
          className={`min-h-[36px] min-w-[4.25rem] rounded-md px-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            isAbsent
              ? "bg-dojo-red text-dojo-white ring-2 ring-dojo-red-hover"
              : "bg-dojo-elevated text-dojo-muted hover:bg-dojo-red/20 hover:text-dojo-red-hover"
          }`}
        >
          Absent
        </button>
      </div>
    </article>
  );
}
