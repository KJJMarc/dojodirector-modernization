"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createAdminStudentAction } from "@/app/admin/[clubSlug]/students/new/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  MEMBERSHIP_ROLE_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS,
} from "@/lib/admin-create-student.shared";
import type {
  AddStudentProgrammeAccessOption,
  StudentPortalAccessProgrammeType,
} from "@/lib/admin-programmes.shared";

interface AddStudentFormProps {
  clubSlug: string;
  programmeSlug?: string;
  cancelHref?: string;
  programmeMembershipOptions: AddStudentProgrammeAccessOption[];
  bookingAccessOptions: AddStudentProgrammeAccessOption[];
}

export function AddStudentForm({
  clubSlug,
  programmeSlug,
  cancelHref,
  programmeMembershipOptions,
  bookingAccessOptions,
}: AddStudentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const defaultSelectedMembership = useMemo(
    () =>
      new Set(
        programmeMembershipOptions
          .filter((option) => option.defaultChecked)
          .map((option) => option.programmeType),
      ),
    [programmeMembershipOptions],
  );
  const defaultSelectedBooking = useMemo(
    () =>
      new Set(
        bookingAccessOptions
          .filter((option) => option.defaultChecked)
          .map((option) => option.programmeType),
      ),
    [bookingAccessOptions],
  );
  const [selectedMembership, setSelectedMembership] = useState(defaultSelectedMembership);
  const [selectedBooking, setSelectedBooking] = useState(defaultSelectedBooking);

  const fieldClassName =
    "mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none focus:border-dojo-red";

  const toggleSelection = (
    current: Set<StudentPortalAccessProgrammeType>,
    programmeType: StudentPortalAccessProgrammeType,
    checked: boolean,
  ) => {
    const next = new Set(current);

    if (checked) {
      next.add(programmeType);
    } else {
      next.delete(programmeType);
    }

    return next;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (selectedMembership.size === 0) {
      setErrorMessage("Select at least one programme student area.");
      return;
    }

    if (selectedBooking.size === 0) {
      setErrorMessage("Select at least one programme for booking access.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    for (const programmeType of Array.from(selectedMembership)) {
      formData.append("programmeMembershipTypes", programmeType);
    }

    for (const programmeType of Array.from(selectedBooking)) {
      formData.append("bookingAccessTypes", programmeType);
    }

    startTransition(async () => {
      try {
        await createAdminStudentAction(formData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to add student.",
        );
      }
    });
  };

  const renderCheckboxFieldset = ({
    legend,
    description,
    options,
    selected,
    onToggle,
  }: {
    legend: string;
    description: string;
    options: AddStudentProgrammeAccessOption[];
    selected: Set<StudentPortalAccessProgrammeType>;
    onToggle: (
      programmeType: StudentPortalAccessProgrammeType,
      checked: boolean,
    ) => void;
  }) => (
    <fieldset className="space-y-2 rounded-lg border border-dojo-border bg-dojo-elevated p-3">
      <legend className="px-1 text-sm font-medium text-dojo-white">{legend}</legend>
      <p className="text-xs text-dojo-muted">{description}</p>
      <ul className="space-y-2">
        {options.map((option) => {
          const checked = selected.has(option.programmeType);

          return (
            <li key={option.programmeType}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dojo-border bg-dojo-surface px-3 py-2 text-sm text-dojo-white transition hover:border-dojo-red/30">
                <input
                  type="checkbox"
                  className="size-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red"
                  checked={checked}
                  disabled={isPending}
                  onChange={(event) =>
                    onToggle(option.programmeType, event.target.checked)
                  }
                />
                <span>{option.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      {programmeSlug ? (
        <input type="hidden" name="programmeSlug" value={programmeSlug} />
      ) : null}
      {errorMessage ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {errorMessage}
        </p>
      ) : null}

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
          required
          autoComplete="email"
          className={fieldClassName}
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
          className={fieldClassName}
          placeholder="Optional admin notes"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="role" className="text-sm font-medium text-dojo-white">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="student"
            className={fieldClassName}
          >
            {MEMBERSHIP_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="membershipStatus"
            className="text-sm font-medium text-dojo-white"
          >
            Membership status
          </label>
          <select
            id="membershipStatus"
            name="membershipStatus"
            defaultValue="active"
            className={fieldClassName}
          >
            {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {renderCheckboxFieldset({
        legend: "Programme Student Areas",
        description: "Choose which programme student lists include this student.",
        options: programmeMembershipOptions,
        selected: selectedMembership,
        onToggle: (programmeType, checked) =>
          setSelectedMembership((current) =>
            toggleSelection(current, programmeType, checked),
          ),
      })}

      {renderCheckboxFieldset({
        legend: "Booking Access",
        description:
          "Choose which programme classes this student can book through the student portal.",
        options: bookingAccessOptions,
        selected: selectedBooking,
        onToggle: (programmeType, checked) =>
          setSelectedBooking((current) =>
            toggleSelection(current, programmeType, checked),
          ),
      })}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add Student"}
        </button>
        <Link
          href={cancelHref ?? clubAdminPath(clubSlug, "students")}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
