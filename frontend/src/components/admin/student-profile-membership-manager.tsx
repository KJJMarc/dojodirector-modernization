"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteStudentAction,
  updateMembershipRoleAction,
  updateMembershipStatusAction,
} from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import {
  PROFILE_MEMBERSHIP_ROLE_OPTIONS,
  PROFILE_MEMBERSHIP_STATUS_OPTIONS,
  STUDENT_DELETE_CONFIRMATION_TEXT,
} from "@/lib/admin-student-membership.shared";
import {
  formatMembershipStatus,
  type AdminStudentProfileDetails,
} from "@/lib/admin-student-profile.shared";

interface StudentProfileMembershipManagerProps {
  clubSlug: string;
  student: AdminStudentProfileDetails;
}

const fieldClassName =
  "mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

export function StudentProfileMembershipManager({
  clubSlug,
  student,
}: StudentProfileMembershipManagerProps) {
  const router = useRouter();
  const [isRolePending, startRoleTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [role, setRole] = useState(student.membershipRole ?? "student");
  const [status, setStatus] = useState(student.membershipStatus ?? "active");
  const [confirmation, setConfirmation] = useState("");
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const submitRoleChange = () => {
    setRoleMessage(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("userId", student.id);
    formData.set("role", role);

    startRoleTransition(async () => {
      try {
        await updateMembershipRoleAction(formData);
        setRoleMessage("Role updated.");
        router.refresh();
      } catch (error) {
        setRoleMessage(
          error instanceof Error ? error.message : "Unable to update role.",
        );
      }
    });
  };

  const submitStatusChange = () => {
    setStatusMessage(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("userId", student.id);
    formData.set("status", status);

    startStatusTransition(async () => {
      try {
        await updateMembershipStatusAction(formData);
        setStatusMessage("Membership status updated.");
        router.refresh();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Unable to update membership status.",
        );
      }
    });
  };

  const submitDelete = () => {
    setDeleteError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("userId", student.id);
    formData.set("confirmation", confirmation);

    startDeleteTransition(async () => {
      try {
        await deleteStudentAction(formData);
      } catch (error) {
        setDeleteError(
          error instanceof Error ? error.message : "Unable to delete student.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            PROFILE ACTIONS
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Manage this member&apos;s club role and membership status.
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Current role
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">{student.role ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Current membership status
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">
              {formatMembershipStatus(student.membershipStatus)}
            </dd>
          </div>
        </dl>

        {student.canChangeRole ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                Change role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className={fieldClassName}
                >
                  {PROFILE_MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isRolePending}
                onClick={submitRoleChange}
                className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRolePending ? "Saving…" : "Save Role"}
              </button>
              {roleMessage ? (
                <p
                  className={`text-sm ${
                    roleMessage.endsWith(".") && !roleMessage.includes("Unable")
                      ? "text-green-400"
                      : "text-dojo-red"
                  }`}
                >
                  {roleMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
                Change membership status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={fieldClassName}
                >
                  {PROFILE_MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isStatusPending}
                onClick={submitStatusChange}
                className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStatusPending ? "Saving…" : "Save Status"}
              </button>
              {statusMessage ? (
                <p
                  className={`text-sm ${
                    statusMessage.endsWith(".") && !statusMessage.includes("Unable")
                      ? "text-green-400"
                      : "text-dojo-red"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-3 text-sm text-dojo-muted">
            This member&apos;s role cannot be changed from the profile page.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-red/40 bg-dojo-red/5 p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            DELETE STUDENT
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Permanently remove this student&apos;s club membership and related
            records for this club. This cannot be undone.
          </p>
        </div>

        {student.canDelete ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Type {STUDENT_DELETE_CONFIRMATION_TEXT} to confirm
              <input
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={STUDENT_DELETE_CONFIRMATION_TEXT}
                className={fieldClassName}
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={
                isDeletePending ||
                confirmation.trim() !== STUDENT_DELETE_CONFIRMATION_TEXT
              }
              onClick={submitDelete}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletePending ? "Deleting…" : "Delete Student"}
            </button>
            {deleteError ? (
              <p className="text-sm text-dojo-red">{deleteError}</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dojo-red/30 bg-dojo-black/40 px-4 py-3 text-sm text-dojo-red">
            Change this member back to student before deleting.
          </p>
        )}
      </section>
    </div>
  );
}
