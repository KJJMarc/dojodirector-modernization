"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useFormState } from "react-dom";
import { updateAdminStudentAction } from "@/app/admin/[clubSlug]/students/[userId]/edit/actions";
import { AdminStudentFormAlert } from "@/components/admin/admin-student-form-alert";
import type { AdminStudentEditPageData } from "@/lib/admin-edit-student.shared";
import { ADMIN_STUDENT_FORM_INITIAL_STATE } from "@/lib/admin-student-form.shared";
import {
  PROFILE_MEMBERSHIP_ROLE_OPTIONS,
  PROFILE_MEMBERSHIP_STATUS_OPTIONS,
} from "@/lib/admin-student-membership.shared";
import { formatInstructorRoleLabel } from "@/lib/admin-instructors.shared";

interface EditStudentFormProps {
  clubSlug: string;
  pageData: AdminStudentEditPageData;
  cancelHref: string;
}

export function EditStudentForm({
  clubSlug,
  pageData,
  cancelHref,
}: EditStudentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [saveState, saveAction] = useFormState(
    updateAdminStudentAction,
    ADMIN_STUDENT_FORM_INITIAL_STATE,
  );
  const formAlert = saveState?.ok === false ? saveState.alert : null;
  const roleInProfileOptions = PROFILE_MEMBERSHIP_ROLE_OPTIONS.some(
    (option) => option.value === pageData.membershipRole,
  );
  const canEditMembershipFields = pageData.canChangeRole && roleInProfileOptions;

  const fieldClassName =
    "mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none focus:border-dojo-red";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      saveAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <input type="hidden" name="userId" value={pageData.userId} />

      {formAlert ? <AdminStudentFormAlert alert={formAlert} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="text-sm font-medium text-dojo-white">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={pageData.firstName}
            autoComplete="given-name"
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="text-sm font-medium text-dojo-white">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={pageData.lastName}
            autoComplete="family-name"
            className={fieldClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-dojo-white">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={pageData.email}
          autoComplete="email"
          aria-invalid={formAlert?.highlightEmailField ? true : undefined}
          className={`${fieldClassName}${
            formAlert?.highlightEmailField
              ? " border-dojo-red/70 focus:border-dojo-red"
              : ""
          }`}
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-dojo-white">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={pageData.phone}
          autoComplete="tel"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="dateOfBirth" className="text-sm font-medium text-dojo-white">
          Date of birth
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={pageData.dateOfBirth}
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="address" className="text-sm font-medium text-dojo-white">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={pageData.address}
          placeholder="Street, city, postcode"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium text-dojo-white">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={pageData.notes}
          placeholder="Optional admin notes"
          className={fieldClassName}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="role" className="text-sm font-medium text-dojo-white">
            Role
          </label>
          {canEditMembershipFields ? (
            <select
              id="role"
              name="role"
              defaultValue={pageData.membershipRole}
              className={fieldClassName}
            >
              {PROFILE_MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <>
              <p className="mt-1 text-sm text-dojo-muted">
                {formatInstructorRoleLabel(pageData.membershipRole)}
              </p>
              <input
                type="hidden"
                name="role"
                value={pageData.membershipRole}
              />
            </>
          )}
        </div>

        <div>
          <label
            htmlFor="membershipStatus"
            className="text-sm font-medium text-dojo-white"
          >
            Membership status
          </label>
          {canEditMembershipFields ? (
            <select
              id="membershipStatus"
              name="membershipStatus"
              defaultValue={pageData.membershipStatus}
              className={fieldClassName}
            >
              {PROFILE_MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <>
              <p className="mt-1 text-sm text-dojo-muted">
                {pageData.membershipStatus.charAt(0).toUpperCase() +
                  pageData.membershipStatus.slice(1)}
              </p>
              <input
                type="hidden"
                name="membershipStatus"
                value={pageData.membershipStatus}
              />
            </>
          )}
        </div>
      </div>

      {!canEditMembershipFields ? (
        <p className="text-xs text-dojo-muted">
          Role and membership status cannot be changed from this page for this
          member. Use profile actions if available.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
