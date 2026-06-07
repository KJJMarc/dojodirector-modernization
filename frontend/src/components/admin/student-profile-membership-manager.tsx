"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteStudentAction,
  updateMembershipRoleAction,
  updateMembershipStatusAction,
} from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import { MigrateToAdultProgrammePanel } from "@/components/admin/migrate-to-adult-programme-panel";
import {
  ProfileDetailItem,
  ProfileSectionHeading,
  profileDetailGridClassName,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import {
  parseProfileMembershipStatusValue,
  PROFILE_MEMBERSHIP_ROLE_OPTIONS,
  PROFILE_MEMBERSHIP_STATUS_OPTIONS,
  STUDENT_DELETE_CONFIRMATION_TEXT,
  type ProfileMembershipStatusValue,
} from "@/lib/admin-student-membership.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import type { KidsToAdultMigrationEligibility } from "@/lib/admin-migrate-kids-to-adult.shared";
import {
  formatMembershipStatus,
  type AdminStudentProfileDetails,
} from "@/lib/admin-student-profile.shared";

interface StudentProfileMembershipManagerProps {
  clubSlug: string;
  student: AdminStudentProfileDetails;
  kidsToAdultMigration: KidsToAdultMigrationEligibility;
}

const fieldClassName =
  "mt-1 min-h-[36px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

const panelLabelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

const saveButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

export function StudentProfileMembershipManager({
  clubSlug,
  student,
  kidsToAdultMigration,
}: StudentProfileMembershipManagerProps) {
  const router = useRouter();
  const [isRolePending, startRoleTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [role, setRole] = useState(student.membershipRole ?? "student");
  const [status, setStatus] = useState<ProfileMembershipStatusValue>(
    () =>
      parseProfileMembershipStatusValue(student.membershipStatus ?? "active") ??
      "active",
  );
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
      const result = await deleteStudentAction(formData);

      if (result.success) {
        router.push(`${clubAdminPath(clubSlug, "students")}?deleted=1`);
        router.refresh();
        return;
      }

      setDeleteError(result.error);
    });
  };

  return (
    <div className="space-y-2">
      <section className={profileSectionClassName}>
        <ProfileSectionHeading
          title="Profile Actions"
          description="Manage this member's club role and membership status."
        />

        <dl className={profileDetailGridClassName}>
          <ProfileDetailItem label="Current role" value={student.role ?? "—"} />
          <ProfileDetailItem
            label="Current membership status"
            value={formatMembershipStatus(student.membershipStatus)}
          />
        </dl>

        {student.canChangeRole ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-dojo-border bg-dojo-elevated p-2.5">
              <label className={`block ${panelLabelClassName}`}>
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
                className={saveButtonClassName}
              >
                {isRolePending ? "Saving…" : "Save Role"}
              </button>
              {roleMessage ? (
                <p
                  className={`text-sm leading-snug ${
                    roleMessage.endsWith(".") && !roleMessage.includes("Unable")
                      ? "text-green-400"
                      : "text-dojo-red"
                  }`}
                >
                  {roleMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-lg border border-dojo-border bg-dojo-elevated p-2.5">
              <label className={`block ${panelLabelClassName}`}>
                Change membership status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ProfileMembershipStatusValue)
                  }
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
                className={saveButtonClassName}
              >
                {isStatusPending ? "Saving…" : "Save Status"}
              </button>
              {statusMessage ? (
                <p
                  className={`text-sm leading-snug ${
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
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm leading-snug text-dojo-muted">
            This member&apos;s role cannot be changed from the profile page.
          </p>
        )}

        {student.lastSuperAdminWarning ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm leading-snug text-dojo-white">
            {student.lastSuperAdminWarning}
          </p>
        ) : null}
      </section>

      <MigrateToAdultProgrammePanel
        clubSlug={clubSlug}
        userId={student.id}
        studentName={student.fullName}
        canMigrate={kidsToAdultMigration.canMigrate}
        disabledReason={kidsToAdultMigration.disabledReason}
      />

      <section className="space-y-2 rounded-xl border border-dojo-red/40 bg-dojo-red/5 p-3">
        <ProfileSectionHeading
          title="Delete Student"
          description="Permanently remove this student's club membership and related records for this club. This cannot be undone."
        />

        {student.canDelete ? (
          <div className="space-y-2">
            <label className={`block ${panelLabelClassName}`}>
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
              className="inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletePending ? "Deleting…" : "Delete Student"}
            </button>
            {deleteError ? (
              <p className="text-sm leading-snug text-dojo-red">{deleteError}</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dojo-red/30 bg-dojo-black/40 px-3 py-2 text-sm leading-snug text-dojo-red">
            Change this member back to student before deleting.
          </p>
        )}
      </section>
    </div>
  );
}
