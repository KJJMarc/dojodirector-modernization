"use client";

import { useTransition } from "react";
import { AttendanceStatusChip } from "@/components/attendance/attendance-status-chip";
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

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold leading-snug text-slate-100">
          {studentName}
        </h3>
        <AttendanceStatusChip status={status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => submitWithStatus("present")}
          disabled={isPending}
          className="rounded-xl bg-emerald-500 px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Present
        </button>
        <button
          type="button"
          onClick={() => submitWithStatus("absent")}
          disabled={isPending}
          className="rounded-xl bg-rose-500 px-4 py-4 text-base font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Absent
        </button>
      </div>
    </article>
  );
}
