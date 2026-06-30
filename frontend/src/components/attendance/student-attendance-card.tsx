"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MarkAttendanceResult } from "@/lib/attendance-marking.shared";
import { AttendanceStatus } from "@/types/database";

interface StudentAttendanceCardProps {
  attendeeId: string;
  userId: string | null;
  studentName: string;
  status: AttendanceStatus;
  markAttendanceAction: (formData: FormData) => Promise<MarkAttendanceResult>;
  markingDisabled?: boolean;
  showAttendanceCardLink?: boolean;
}

export function StudentAttendanceCard({
  attendeeId,
  userId,
  studentName,
  status,
  markAttendanceAction,
  markingDisabled = false,
  showAttendanceCardLink = true,
}: StudentAttendanceCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayStatus, setDisplayStatus] = useState<AttendanceStatus>(status);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devErrorMessage, setDevErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setDisplayStatus(status);
  }, [status, attendeeId]);

  const submitWithStatus = (
    nextStatus: "present" | "absent" | "not_marked",
  ) => {
    if (markingDisabled || isPending || inFlightRef.current) {
      return;
    }

    const previousStatus = displayStatus;
    setErrorMessage(null);
    setDevErrorMessage(null);
    setDisplayStatus(nextStatus === "not_marked" ? null : nextStatus);
    inFlightRef.current = true;

    const formData = new FormData();
    formData.set("attendeeId", attendeeId);
    formData.set("attendanceStatus", nextStatus);

    startTransition(async () => {
      try {
        const result = await markAttendanceAction(formData);

        if (result.status === "error") {
          setDisplayStatus(previousStatus);
          setErrorMessage(result.message);
          setDevErrorMessage(result.devMessage ?? null);
          return;
        }

        router.refresh();
      } finally {
        inFlightRef.current = false;
      }
    });
  };

  const isPresent = displayStatus === "present";
  const isAbsent = displayStatus === "absent";
  const isUnmarked = !isPresent && !isAbsent;

  return (
    <article
      className={`rounded-lg border border-dojo-border bg-dojo-surface px-2 py-2 ${
        isPending || markingDisabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium leading-tight text-dojo-white">
            {studentName}
          </h3>
          {showAttendanceCardLink && userId ? (
            <Link
              href={`/students/${userId}/attendance-card`}
              className="text-xs text-dojo-muted hover:text-dojo-red"
            >
              View Attendance Card
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => submitWithStatus("not_marked")}
            disabled={isPending || markingDisabled || isUnmarked}
            aria-label={`Clear ${studentName} attendance`}
            title="Clear attendance"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated text-sm font-semibold leading-none text-dojo-red transition hover:border-dojo-red/60 hover:bg-dojo-red/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span aria-hidden="true">✕</span>
          </button>
          <button
            type="button"
            onClick={() => submitWithStatus("present")}
            disabled={isPending || markingDisabled}
            aria-pressed={isPresent}
            aria-label={`Mark ${studentName} present`}
            className={`min-h-[44px] min-w-[4.75rem] rounded-md px-3 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
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
            className={`min-h-[44px] min-w-[4.75rem] rounded-md px-3 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
              isAbsent
                ? "bg-dojo-red text-dojo-white ring-2 ring-dojo-red-hover"
                : "border border-dojo-red/40 bg-dojo-elevated text-dojo-red hover:bg-dojo-red/25"
            }`}
          >
            Absent
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-2 space-y-1" role="alert">
          <p className="text-xs text-dojo-red">{errorMessage}</p>
          {devErrorMessage ? (
            <p className="break-words font-mono text-[11px] text-dojo-muted">
              Dev: {devErrorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
