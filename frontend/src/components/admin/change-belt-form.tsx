"use client";

import { useState, useTransition } from "react";
import { awardBeltLevelAction } from "@/app/admin/students/[userId]/change-belt/actions";
import {
  getTodayDateInputValue,
  type BeltCategory,
  type BeltLevelOption,
} from "@/lib/admin-belt-levels.shared";

interface ChangeBeltFormProps {
  userId: string;
  adultBeltOptions: BeltLevelOption[];
}

export function ChangeBeltForm({
  userId,
  adultBeltOptions,
}: ChangeBeltFormProps) {
  const [category, setCategory] = useState<BeltCategory>("adult");
  const [isPending, startTransition] = useTransition();
  const [selectedBeltLevelId, setSelectedBeltLevelId] = useState("");
  const [awardedAt, setAwardedAt] = useState(getTodayDateInputValue);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitAward = () => {
    setError(null);

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("beltLevelId", selectedBeltLevelId);
    formData.set("awardedAt", awardedAt);
    formData.set("notes", notes);

    startTransition(async () => {
      try {
        await awardBeltLevelAction(formData);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to award belt level.",
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("adult")}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            category === "adult"
              ? "border-dojo-red bg-dojo-red text-dojo-white"
              : "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50"
          }`}
        >
          Adult belts
        </button>
        <button
          type="button"
          onClick={() => setCategory("junior")}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            category === "junior"
              ? "border-dojo-red bg-dojo-red text-dojo-white"
              : "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50"
          }`}
        >
          Junior belts
        </button>
      </div>

      {category === "junior" ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
          Junior belts have not been added yet.
        </p>
      ) : (
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Adult belt level
            <select
              value={selectedBeltLevelId}
              onChange={(event) => setSelectedBeltLevelId(event.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
            >
              <option value="">Select a belt level…</option>
              {adultBeltOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Awarded date
            <input
              type="date"
              value={awardedAt}
              onChange={(event) => setAwardedAt(event.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional grading notes"
              className="mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
            />
          </label>

          <button
            type="button"
            disabled={isPending || !selectedBeltLevelId || !awardedAt}
            onClick={submitAward}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Award belt level"}
          </button>
        </div>
      )}

      {error ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
