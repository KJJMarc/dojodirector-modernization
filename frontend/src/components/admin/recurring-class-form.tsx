"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRecurringClassAction } from "@/app/admin/classes/actions";
import { PROGRAMME_TYPES, formatProgrammeTypeLabel } from "@/lib/admin-programme-types";
import { DAY_OF_WEEK_OPTIONS } from "@/lib/admin-recurring-classes.shared";

export function RecurringClassForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createRecurringClassAction(formData);
        router.push("/admin/classes");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to create recurring class.",
        );
      }
    });
  };

  const fieldClassName =
    "mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none focus:border-dojo-red";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <label htmlFor="className" className="text-sm font-medium text-dojo-white">
          Class name
        </label>
        <input
          id="className"
          name="className"
          type="text"
          required
          className={fieldClassName}
          placeholder="All-Levels Jiu Jitsu"
        />
      </div>

      <div>
        <label
          htmlFor="programmeType"
          className="text-sm font-medium text-dojo-white"
        >
          Programme type
        </label>
        <select
          id="programmeType"
          name="programmeType"
          required
          defaultValue="bjj"
          className={fieldClassName}
        >
          {PROGRAMME_TYPES.map((programmeType) => (
            <option key={programmeType} value={programmeType}>
              {formatProgrammeTypeLabel(programmeType)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dayOfWeek" className="text-sm font-medium text-dojo-white">
            Day of week
          </label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            required
            defaultValue="1"
            className={fieldClassName}
          >
            {DAY_OF_WEEK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="capacity" className="text-sm font-medium text-dojo-white">
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={30}
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startTime" className="text-sm font-medium text-dojo-white">
            Start time
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="endTime" className="text-sm font-medium text-dojo-white">
            End time
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            className={fieldClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="text-sm font-medium text-dojo-white">
          Venue / location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          className={fieldClassName}
          placeholder="Tiffin Sports Centre"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-dojo-white">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked
          className="h-4 w-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red"
        />
        Active by default
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[40px] rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create recurring class"}
        </button>
        <Link
          href="/admin/classes"
          className="inline-flex min-h-[40px] items-center rounded-md border border-dojo-border px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-elevated"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
