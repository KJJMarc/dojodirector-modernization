"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeStudentFromProgrammeAction } from "@/app/admin/[clubSlug]/programmes/[programmeSlug]/students/actions";
import { buildStudentProfileAdminPath } from "@/lib/admin-programmes.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

interface ProgrammeStudentRowActionsProps {
  clubSlug: string;
  programmeSlug: string;
  programmeName: string;
  studentId: string;
  studentName: string;
  compact?: boolean;
  showAttendanceCard?: boolean;
}

const ATTENDANCE_CARD_YEAR = 2026;

export function ProgrammeStudentRowActions({
  clubSlug,
  programmeSlug,
  programmeName,
  studentId,
  studentName,
  compact = false,
  showAttendanceCard = true,
}: ProgrammeStudentRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const buttonClassName = compact
    ? "inline-flex min-h-[32px] shrink-0 items-center whitespace-nowrap rounded-md border border-dojo-border bg-dojo-elevated px-2 py-1 text-[11px] font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:cursor-not-allowed disabled:opacity-60"
    : "min-h-[36px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:cursor-not-allowed disabled:opacity-60";

  const removeButtonClassName = compact
    ? "inline-flex min-h-[32px] shrink-0 items-center whitespace-nowrap rounded-md border border-dojo-red/40 bg-dojo-elevated px-2 py-1 text-[11px] font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-60"
    : "min-h-[36px] rounded-md border border-dojo-red/40 bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-60";

  const attendanceCardLabel = compact ? "Card" : "Attendance Card";

  const submitRemove = () => {
    const confirmed = window.confirm(
      `Remove ${studentName} from ${programmeName}?\n\nThis removes their programme access for ${programmeName}. Their user account, other programmes, attendance, and grades are not affected.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("programmeSlug", programmeSlug);
    formData.set("userId", studentId);

    startTransition(async () => {
      await removeStudentFromProgrammeAction(formData);
      router.refresh();
    });
  };

  return (
    <div
      className={
        compact
          ? "inline-flex max-w-full flex-row flex-nowrap items-center gap-1"
          : "flex flex-wrap gap-2"
      }
    >
      {showAttendanceCard ? (
        <Link
          href={`/students/${studentId}/attendance-card?year=${ATTENDANCE_CARD_YEAR}`}
          className={buttonClassName}
          title="Attendance Card"
          aria-label="Attendance Card"
        >
          {attendanceCardLabel}
        </Link>
      ) : null}
      <Link
        href={buildStudentProfileAdminPath(clubSlug, studentId, {
          programmeSlug,
        })}
        className={buttonClassName}
        title="Profile"
        aria-label="Profile"
      >
        Profile
      </Link>
      <button
        type="button"
        onClick={submitRemove}
        disabled={isPending}
        className={removeButtonClassName}
      >
        {isPending ? "Removing…" : compact ? "Remove" : "Remove from Programme"}
      </button>
    </div>
  );
}
