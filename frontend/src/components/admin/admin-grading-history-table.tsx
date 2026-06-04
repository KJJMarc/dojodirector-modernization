"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteGradeAwardAction,
  updateGradeAwardAction,
} from "@/app/admin/[clubSlug]/students/[userId]/grading-history/actions";
import {
  formatProfileDate,
  formatProfileField,
  type AdminStudentProfileGradeHistoryEntry,
} from "@/lib/admin-student-profile.shared";
import { canDeleteGradeAward } from "@/lib/admin-grade-award.shared";
import type { BeltLevelOption } from "@/lib/admin-belt-levels.shared";

interface AdminGradingHistoryTableProps {
  clubSlug: string;
  userId: string;
  entries: AdminStudentProfileGradeHistoryEntry[];
  beltOptions: {
    adult: BeltLevelOption[];
    junior: BeltLevelOption[];
  };
}

function toDateInputValue(awardedAt: string) {
  const match = awardedAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? awardedAt.slice(0, 10);
}

export function AdminGradingHistoryTable({
  clubSlug,
  userId,
  entries,
  beltOptions,
}: AdminGradingHistoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [beltLevelId, setBeltLevelId] = useState("");
  const [awardedAt, setAwardedAt] = useState("");
  const [notes, setNotes] = useState("");

  const allBeltOptions = useMemo(
    () => [...beltOptions.adult, ...beltOptions.junior],
    [beltOptions.adult, beltOptions.junior],
  );

  const beginEdit = (entry: AdminStudentProfileGradeHistoryEntry) => {
    setError(null);
    setEditingAwardId(entry.id);
    setBeltLevelId(entry.beltLevelId ?? "");
    setAwardedAt(toDateInputValue(entry.awardedAt));
    setNotes(entry.notes ?? "");
  };

  const cancelEdit = () => {
    setEditingAwardId(null);
    setError(null);
  };

  const saveEdit = () => {
    if (!editingAwardId || !beltLevelId || !awardedAt) {
      setError("Belt level and awarded date are required.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("userId", userId);
    formData.set("awardId", editingAwardId);
    formData.set("beltLevelId", beltLevelId);
    formData.set("awardedAt", awardedAt);
    formData.set("notes", notes);

    startTransition(async () => {
      try {
        await updateGradeAwardAction(formData);
        setEditingAwardId(null);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to update grade award.",
        );
      }
    });
  };

  const removeAward = (awardId: string, beltLabel: string) => {
    const confirmed = window.confirm(
      `Remove the "${beltLabel}" award from grading history? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("userId", userId);
    formData.set("awardId", awardId);

    startTransition(async () => {
      try {
        await deleteGradeAwardAction(formData);
        if (editingAwardId === awardId) {
          setEditingAwardId(null);
        }
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete grade award.",
        );
      }
    });
  };

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-4 text-center text-sm text-dojo-muted">
        No grading history recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-dojo-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-[11px] font-medium uppercase tracking-wide text-dojo-muted">
              <th className="px-3 py-1.5">Belt level</th>
              <th className="px-3 py-1.5">Awarded</th>
              <th className="px-3 py-1.5">Notes</th>
              <th className="px-3 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isEditing = editingAwardId === entry.id;

              return (
                <tr
                  key={entry.id}
                  className="border-b border-dojo-border/70 align-top last:border-b-0"
                >
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <select
                        value={beltLevelId}
                        onChange={(event) => setBeltLevelId(event.target.value)}
                        disabled={isPending}
                        className="min-h-[36px] w-full min-w-[12rem] rounded-md border border-dojo-border bg-dojo-black px-2 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
                      >
                        <option value="">Select belt level…</option>
                        {allBeltOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium leading-snug text-dojo-white">
                        {entry.beltLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="date"
                        value={awardedAt}
                        onChange={(event) => setAwardedAt(event.target.value)}
                        disabled={isPending}
                        className="min-h-[36px] w-full rounded-md border border-dojo-border bg-dojo-black px-2 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
                      />
                    ) : (
                      <span className="whitespace-nowrap leading-snug text-dojo-muted">
                        {formatProfileDate(entry.awardedAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        disabled={isPending}
                        rows={2}
                        className="w-full min-w-[10rem] rounded-md border border-dojo-border bg-dojo-black px-2 py-1 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
                      />
                    ) : (
                      <span className="leading-snug text-dojo-muted">
                        {formatProfileField(entry.notes)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={saveEdit}
                            className="inline-flex min-h-[32px] items-center justify-center rounded-md bg-dojo-red px-3 py-1 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPending ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={cancelEdit}
                            className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => beginEdit(entry)}
                            className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={
                              isPending ||
                              !canDeleteGradeAward(entries, entry.id)
                            }
                            onClick={() => removeAward(entry.id, entry.beltLabel)}
                            className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
