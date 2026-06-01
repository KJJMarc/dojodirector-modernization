"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createOneOffEventAction } from "@/app/admin/[clubSlug]/classes/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  PROGRAMME_TYPES,
  formatProgrammeTypeLabel,
} from "@/lib/admin-programme-types";

export function OneOffEventForm({ clubSlug }: { clubSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("clubSlug", clubSlug);

    startTransition(async () => {
      try {
        await createOneOffEventAction(formData);
        router.push(clubAdminPath(clubSlug, "classes/edit"));
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to create one-off event.",
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
        <label htmlFor="title" className="text-sm font-medium text-dojo-white">
          Event title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className={fieldClassName}
          placeholder="Seminar, Grading, Open Mat…"
        />
      </div>

      <div>
        <label htmlFor="programmeType" className="text-sm font-medium text-dojo-white">
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
        <p className="mt-1 text-xs text-dojo-muted">
          Use BJJ for seminars, gradings and events that should count on BJJ
          attendance cards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="text-sm font-medium text-dojo-white">
            Date
          </label>
          <input id="date" name="date" type="date" required className={fieldClassName} />
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

      <div>
        <label htmlFor="description" className="text-sm font-medium text-dojo-white">
          Notes / description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className={fieldClassName}
          placeholder="Optional details for admins"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[40px] rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create one-off event"}
        </button>
        <Link
          href={clubAdminPath(clubSlug, "classes/edit")}
          className="inline-flex min-h-[40px] items-center rounded-md border border-dojo-border px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-elevated"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
