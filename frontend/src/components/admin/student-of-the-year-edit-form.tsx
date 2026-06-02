"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { saveStudentOfTheYearAwardAction } from "@/app/admin/[clubSlug]/academy-pages/actions";
import { clubAcademyPagesAdminPath } from "@/lib/admin-academy-pages.shared";
import type { StudentOfTheYearAdminEditState } from "@/lib/student-of-the-year.server";
import type { StudentOfTheYearAward } from "@/lib/student-of-the-year.shared";

interface StudentOfTheYearEditFormProps {
  clubSlug: string;
  state: StudentOfTheYearAdminEditState;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-dojo-muted";

const buttonClassName =
  "inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 text-sm font-semibold text-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

function ExistingWinnersList({
  awards,
  editingYear,
  onEdit,
}: {
  awards: StudentOfTheYearAward[];
  editingYear: number | null;
  onEdit: (award: StudentOfTheYearAward) => void;
}) {
  if (awards.length === 0) {
    return (
      <p className="rounded-md border border-dojo-border bg-dojo-elevated px-3 py-3 text-sm text-dojo-muted">
        No winners have been saved yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-dojo-border rounded-md border border-dojo-border">
      {awards.map((award) => {
        const isEditing = editingYear === award.year;

        return (
          <li
            key={award.id}
            className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              isEditing ? "bg-dojo-elevated/80" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-dojo-white">{award.year}</p>
              <p className="mt-1 text-sm text-dojo-muted">{award.studentName}</p>
            </div>

            <button
              type="button"
              onClick={() => onEdit(award)}
              className={secondaryButtonClassName}
              aria-current={isEditing ? "true" : undefined}
            >
              {isEditing ? "Editing" : "Edit"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function StudentOfTheYearEditForm({
  clubSlug,
  state,
}: StudentOfTheYearEditFormProps) {
  const defaultYear = state.yearOptions[0] ?? new Date().getFullYear();
  const awardsByYear = useMemo(
    () => new Map(state.awards.map((award) => [award.year, award.studentName])),
    [state.awards],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [studentName, setStudentName] = useState("");
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function loadAwardIntoForm(award: StudentOfTheYearAward) {
    setSelectedYear(award.year);
    setStudentName(award.studentName);
    setEditingYear(award.year);
    setSuccessMessage(null);
    setErrorMessage(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleYearChange(year: number) {
    setSelectedYear(year);
    setStudentName(awardsByYear.get(year) ?? "");
    setEditingYear(awardsByYear.has(year) ? year : null);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);
          setSuccessMessage(null);

          const trimmedName = studentName.trim();

          if (!Number.isInteger(selectedYear)) {
            setErrorMessage("Select a valid award year.");
            return;
          }

          if (!trimmedName) {
            setErrorMessage("Student name must not be blank.");
            return;
          }

          const formData = new FormData(event.currentTarget);
          formData.set("year", String(selectedYear));
          formData.set("studentName", trimmedName);

          const isUpdate = awardsByYear.has(selectedYear);

          startTransition(async () => {
            try {
              await saveStudentOfTheYearAwardAction(formData);
              setSuccessMessage(
                isUpdate
                  ? `Updated the ${selectedYear} winner.`
                  : `Saved the ${selectedYear} winner.`,
              );
              setEditingYear(selectedYear);
              router.refresh();
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to save Student of the Year award.",
              );
            }
          });
        }}
      >
        <input type="hidden" name="clubSlug" value={clubSlug} />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Add or Update Winner
          </h2>
          <p className="mt-2 text-sm text-dojo-muted">
            Choose a year and enter the winner&apos;s name, or click Edit on an
            existing winner below to load their details here. Saving an existing
            year updates that record instead of creating a duplicate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="award-year" className={labelClassName}>
              Year
            </label>
            <select
              id="award-year"
              name="year"
              required
              value={selectedYear}
              onChange={(event) => handleYearChange(Number(event.target.value))}
              className={inputClassName}
            >
              {state.yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="student-name" className={labelClassName}>
              Student name
            </label>
            <input
              id="student-name"
              name="studentName"
              type="text"
              required
              value={studentName}
              onChange={(event) => {
                setStudentName(event.target.value);
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              className={inputClassName}
              placeholder="Winner name"
            />
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {successMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={buttonClassName} disabled={isPending}>
            {isPending ? "Saving..." : "Save Winner"}
          </button>
          <Link
            href={clubAcademyPagesAdminPath(clubSlug)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
          >
            Back to Academy Pages
          </Link>
        </div>
      </form>

      <section aria-label="Existing Student of the Year winners">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Existing Winners
        </h2>
        <p className="mt-2 text-sm text-dojo-muted">
          All current winners, newest first. Use Edit to load a winner into the
          form above for corrections.
        </p>
        <div className="mt-3">
          <ExistingWinnersList
            awards={state.awards}
            editingYear={editingYear}
            onEdit={loadAwardIntoForm}
          />
        </div>
      </section>
    </div>
  );
}
