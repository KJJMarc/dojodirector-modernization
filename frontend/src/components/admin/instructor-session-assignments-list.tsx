"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { assignInstructorToClassSessionAction } from "@/app/admin/[clubSlug]/instructors/sessions/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import { RECURRING_REACTIVATE_BUTTON_CLASS } from "@/components/admin/recurring-class-action-styles";
import { formatProgrammeTypeLabel, formatSessionStatusLabel } from "@/lib/admin-programme-types";
import type {
  InstructorSessionAllocationRow,
  InstructorSessionAssignmentsPageData,
} from "@/lib/admin-instructors.shared";
import { getStudentFullName } from "@/lib/attendance";

interface InstructorSessionAssignmentsListProps {
  clubSlug: string;
  pageData: InstructorSessionAssignmentsPageData;
}

const REPLACE_FIELD_CLASS =
  "min-h-[32px] w-full min-w-[140px] rounded-md border border-dojo-border bg-dojo-black px-2 text-xs text-dojo-white outline-none ring-green-600 focus:ring-2";

function SessionStatusBadge({ session }: { session: InstructorSessionAllocationRow }) {
  if (session.isCancelled) {
    return (
      <span className="inline-flex rounded-full bg-dojo-red/15 px-2 py-0.5 text-xs font-semibold text-dojo-red">
        {formatSessionStatusLabel("cancelled")}
      </span>
    );
  }

  if (session.isCompleted) {
    return (
      <span className="inline-flex rounded-full bg-neutral-500/15 px-2 py-0.5 text-xs font-semibold text-neutral-300">
        {formatSessionStatusLabel("completed")}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
      {formatSessionStatusLabel("scheduled")}
    </span>
  );
}

function ReplaceInstructorControl({
  session,
  instructorOptions,
  isPending,
  onSubmit,
}: {
  session: InstructorSessionAllocationRow;
  instructorOptions: Array<{ id: string; label: string }>;
  isPending: boolean;
  onSubmit: (sessionId: string, instructorUserId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState(
    session.instructorUserId ?? "",
  );

  if (!isEditing) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setSelectedInstructorId(session.instructorUserId ?? "");
          setIsEditing(true);
        }}
        className={`${RECURRING_REACTIVATE_BUTTON_CLASS} !h-8 !min-h-[32px] !w-auto whitespace-nowrap px-3`}
      >
        Replace instructor
      </button>
    );
  }

  return (
    <div className="flex min-w-[200px] flex-col gap-1.5">
      <select
        value={selectedInstructorId}
        onChange={(event) => setSelectedInstructorId(event.target.value)}
        className={REPLACE_FIELD_CLASS}
      >
        <option value="">Select instructor…</option>
        {instructorOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={isPending || !selectedInstructorId}
          onClick={() => onSubmit(session.sessionId, selectedInstructorId)}
          className="min-h-[32px] rounded-md bg-dojo-red px-3 py-1 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsEditing(false)}
          className="min-h-[32px] rounded-md border border-dojo-border px-3 py-1 text-xs font-semibold text-dojo-muted transition hover:text-dojo-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function InstructorSessionAssignmentsList({
  clubSlug,
  pageData,
}: InstructorSessionAssignmentsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessions = pageData.sessions;

  const instructorOptions = useMemo(
    () =>
      pageData.instructors.map((instructor) => ({
        id: instructor.id,
        label: getStudentFullName(instructor.firstName, instructor.lastName),
      })),
    [pageData.instructors],
  );

  const submitAssignment = (classSessionId: string, instructorUserId: string) => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("classSessionId", classSessionId);
    formData.set("instructorUserId", instructorUserId);

    startTransition(async () => {
      try {
        await assignInstructorToClassSessionAction(formData);
        setMessage("Cover instructor saved for this session.");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to replace instructor.",
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-md border border-green-700/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {error}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
          No sessions scheduled in the next 8 weeks.
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-dojo-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Time</th>
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">Programme</th>
                <th className="px-3 py-2 font-semibold">Venue</th>
                <th className="px-3 py-2 font-semibold">Instructor</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.sessionId}
                  className={`border-b border-dojo-border/70 align-middle last:border-b-0 ${
                    session.isCancelled ? "opacity-75" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                    {session.dateLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                    {session.timeLabel}
                  </td>
                  <td className="px-3 py-2 font-medium text-dojo-white">
                    {session.className}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                    {formatProgrammeTypeLabel(session.programmeType)}
                  </td>
                  <td className="px-3 py-2 text-dojo-muted">{session.locationLabel}</td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 ${
                      session.assignmentSource === "none"
                        ? "text-dojo-muted"
                        : "text-dojo-white"
                    }`}
                  >
                    {session.instructorName}
                  </td>
                  <td className="px-3 py-2">
                    <SessionStatusBadge session={session} />
                  </td>
                  <td className="px-3 py-2">
                    <ReplaceInstructorControl
                      session={session}
                      instructorOptions={instructorOptions}
                      isPending={isPending}
                      onSubmit={submitAssignment}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <Link
          href={clubAdminPath(clubSlug, "instructors/classes")}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Recurring allocations
        </Link>
        <Link
          href={clubAdminPath(clubSlug, "instructors")}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to instructors
        </Link>
      </div>
    </div>
  );
}
