"use client";

import { useState, useTransition } from "react";
import { awardBeltLevelAction } from "@/app/admin/[clubSlug]/students/[userId]/change-belt/actions";
import {
  getTodayDateInputValue,
  type BeltCategory,
  type BeltLevelOption,
} from "@/lib/admin-belt-levels.shared";

interface ChangeBeltFormProps {
  clubSlug: string;
  userId: string;
  adultBeltOptions: BeltLevelOption[];
  juniorBeltOptions: BeltLevelOption[];
}

export function ChangeBeltForm({
  clubSlug,
  userId,
  adultBeltOptions,
  juniorBeltOptions,
}: ChangeBeltFormProps) {
  const [category, setCategory] = useState<BeltCategory>("adult");
  const [isPending, startTransition] = useTransition();
  const [selectedBeltLevelId, setSelectedBeltLevelId] = useState("");
  const [awardedAt, setAwardedAt] = useState(getTodayDateInputValue);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeOptions =
    category === "adult" ? adultBeltOptions : juniorBeltOptions;
  const selectedInActiveOptions = activeOptions.some(
    (option) => option.id === selectedBeltLevelId,
  );
  const beltSelectValue = selectedInActiveOptions ? selectedBeltLevelId : "";

  const switchCategory = (nextCategory: BeltCategory) => {
    setCategory(nextCategory);
    setSelectedBeltLevelId("");
    setError(null);
  };

  const submitAward = () => {
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
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
          onClick={() => switchCategory("adult")}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            category === "adult"
              ? "border-dojo-red bg-dojo-red text-dojo-white"
              : "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50"
          }`}
        >
          Adult Belts
        </button>
        <button
          type="button"
          onClick={() => switchCategory("junior")}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            category === "junior"
              ? "border-dojo-red bg-dojo-red text-dojo-white"
              : "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50"
          }`}
        >
          Junior Belts
        </button>
      </div>

      {activeOptions.length === 0 ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
          {category === "adult"
            ? "No adult belt levels are configured for this club."
            : "No junior belt levels are configured for this club."}
        </p>
      ) : (
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            {category === "adult" ? "Adult belt level" : "Junior belt level"}
            <select
              value={beltSelectValue}
              onChange={(event) => setSelectedBeltLevelId(event.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
            >
              <option value="">Select a belt level…</option>
              {activeOptions.map((option) => (
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
            {isPending ? "Saving…" : "Award Belt Level"}
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
