"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  assignInstructorToRecurringScheduleAction,
  deactivateInstructorAssignmentAction,
} from "@/app/admin/[clubSlug]/instructors/classes/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import type { InstructorClassAssignmentsPageData } from "@/lib/admin-instructors.shared";
import { getStudentFullName } from "@/lib/attendance";

interface InstructorClassAssignmentsManagerProps {
  clubSlug: string;
  pageData: InstructorClassAssignmentsPageData;
  initialInstructorId?: string;
}

export function InstructorClassAssignmentsManager({
  clubSlug,
  pageData,
  initialInstructorId = "",
}: InstructorClassAssignmentsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [instructorUserId, setInstructorUserId] = useState(initialInstructorId);
  const [recurringScheduleId, setRecurringScheduleId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const instructorOptions = useMemo(
    () =>
      pageData.instructors.map((instructor) => ({
        id: instructor.id,
        label: getStudentFullName(instructor.firstName, instructor.lastName),
      })),
    [pageData.instructors],
  );

  const submitAssignment = () => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("instructorUserId", instructorUserId);
    formData.set("recurringScheduleId", recurringScheduleId);

    startTransition(async () => {
      try {
        await assignInstructorToRecurringScheduleAction(formData);
        setMessage("Instructor assigned to recurring class.");
        setRecurringScheduleId("");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to assign instructor.",
        );
      }
    });
  };

  const submitDeactivate = (assignmentId: string) => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("assignmentId", assignmentId);

    startTransition(async () => {
      try {
        await deactivateInstructorAssignmentAction(formData);
        setMessage("Assignment removed.");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to remove assignment.",
        );
      }
    });
  };

  const fieldClassName =
    "mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={clubAdminPath(clubSlug, "instructors/sessions")}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Manage session cover
        </Link>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Assign instructor
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Assign an instructor to a recurring weekly class. Only one active
            instructor is kept per recurring class slot.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Instructor
            <select
              value={instructorUserId}
              onChange={(event) => setInstructorUserId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Select an instructor…</option>
              {instructorOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Recurring class
            <select
              value={recurringScheduleId}
              onChange={(event) => setRecurringScheduleId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Select a recurring class…</option>
              {pageData.schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={isPending || !instructorUserId || !recurringScheduleId}
            onClick={submitAssignment}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Assigning…" : "Assign instructor"}
          </button>
        </div>
      </section>

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

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Current allocations
          </h2>
        </div>

        {pageData.assignments.length === 0 ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
            No instructor allocations configured.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-4 py-3 font-semibold">Instructor</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-dojo-white">
                        {assignment.instructorName}
                      </div>
                      {assignment.instructorEmail ? (
                        <div className="text-xs text-dojo-muted">
                          {assignment.instructorEmail}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">
                      {assignment.targetLabel}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">
                      {assignment.assignmentType === "recurring"
                        ? "Recurring"
                        : "Session"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => submitDeactivate(assignment.id)}
                        className="min-h-[32px] rounded-md bg-dojo-red px-3 py-1 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link
        href={clubAdminPath(clubSlug, "instructors")}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to instructors
      </Link>
    </div>
  );
}
