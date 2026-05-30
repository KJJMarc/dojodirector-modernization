"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateClassSessionAction } from "@/app/admin/classes/actions";
import {
  PROGRAMME_TYPES,
  SESSION_STATUSES,
  formatProgrammeTypeLabel,
  formatSessionStatusLabel,
} from "@/lib/admin-programme-types";
import {
  EditableClassSession,
  formatSessionKindLabel,
} from "@/lib/admin-class-sessions.shared";

interface EditClassSessionFormProps {
  session: EditableClassSession;
}

export function EditClassSessionForm({ session }: EditClassSessionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("sessionId", session.id);

    startTransition(async () => {
      try {
        await updateClassSessionAction(formData);
        router.push("/admin/classes");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to update session.",
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

      <p className="text-xs text-dojo-muted">
        {formatSessionKindLabel(session.sessionKind)} session
      </p>

      <div>
        <label htmlFor="title" className="text-sm font-medium text-dojo-white">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={session.title}
          readOnly={session.sessionKind === "recurring"}
          className={`${fieldClassName} ${session.sessionKind === "recurring" ? "opacity-70" : ""}`}
        />
        {session.sessionKind === "recurring" ? (
          <p className="mt-1 text-xs text-dojo-muted">
            Recurring session titles are managed on the recurring class template.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="programmeType" className="text-sm font-medium text-dojo-white">
            Programme type
          </label>
          <select
            id="programmeType"
            name="programmeType"
            required
            defaultValue={session.programmeType}
            className={fieldClassName}
          >
            {PROGRAMME_TYPES.map((programmeType) => (
              <option key={programmeType} value={programmeType}>
                {formatProgrammeTypeLabel(programmeType)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium text-dojo-white">
            Status
          </label>
          <select
            id="status"
            name="status"
            required
            defaultValue={session.status}
            className={fieldClassName}
          >
            {SESSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatSessionStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="text-sm font-medium text-dojo-white">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={session.date}
            className={fieldClassName}
          />
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
            defaultValue={session.capacity}
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
            defaultValue={session.startTime}
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
            defaultValue={session.endTime}
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
          defaultValue={session.location}
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-medium text-dojo-white">
          Notes / description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={session.description ?? ""}
          className={fieldClassName}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[40px] rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save session"}
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
