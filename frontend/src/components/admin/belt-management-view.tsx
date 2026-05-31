"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  updateAdultBeltRequirementAction,
  updateJuniorBeltRequirementAction,
} from "@/app/admin/[clubSlug]/belts/actions";
import { RECURRING_ACTION_BUTTON_CLASS } from "@/components/admin/recurring-class-action-styles";
import type {
  AdultBeltRequirementRow,
  JuniorBeltRequirementRow,
} from "@/lib/admin-belt-management.shared";

type BeltManagementTab = "adult" | "junior";

const NUMBER_INPUT_CLASS =
  "w-24 min-h-[32px] rounded-md border border-dojo-border bg-dojo-black px-2 text-sm tabular-nums text-dojo-white outline-none ring-green-600 focus:ring-2";

const SAVE_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-dojo-red px-3 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

const CANCEL_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-xs font-semibold text-dojo-muted transition hover:text-dojo-white disabled:cursor-not-allowed disabled:opacity-60";

interface BeltManagementViewProps {
  clubSlug: string;
  adultRequirements: AdultBeltRequirementRow[];
  juniorRequirements: JuniorBeltRequirementRow[];
}

function RequirementsTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-dojo-border">
      <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
    </div>
  );
}

function EmptyRequirementsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
      {message}
    </p>
  );
}

function ActionButtons({
  isEditing,
  isPending,
  onEdit,
  onSave,
  onCancel,
}: {
  isEditing: boolean;
  isPending: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className={SAVE_BUTTON_CLASS}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className={CANCEL_BUTTON_CLASS}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onEdit}
      className={RECURRING_ACTION_BUTTON_CLASS}
    >
      Edit
    </button>
  );
}

function AdultRequirementsTable({
  clubSlug,
  rows,
}: {
  clubSlug: string;
  rows: AdultBeltRequirementRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAttendance, setDraftAttendance] = useState("");
  const [draftMonths, setDraftMonths] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  const startEdit = (row: AdultBeltRequirementRow) => {
    setRowError(null);
    setEditingId(row.id);
    setDraftAttendance(String(row.requiredAttendance));
    setDraftMonths(String(row.requiredMonths));
  };

  const cancelEdit = () => {
    setRowError(null);
    setEditingId(null);
    setDraftAttendance("");
    setDraftMonths("");
  };

  const saveEdit = (requirementId: string) => {
    setRowError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("requirementId", requirementId);
    formData.set("requiredAttendance", draftAttendance);
    formData.set("requiredMonths", draftMonths);

    startTransition(async () => {
      try {
        await updateAdultBeltRequirementAction(formData);
        cancelEdit();
        router.refresh();
      } catch (error) {
        setRowError(
          error instanceof Error ? error.message : "Unable to save changes.",
        );
      }
    });
  };

  return (
    <RequirementsTable>
      <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted">
        <tr>
          <th className="px-4 py-3 font-semibold">Target belt</th>
          <th className="px-4 py-3 font-semibold">Required attendance</th>
          <th className="px-4 py-3 font-semibold">Required time</th>
          <th className="px-4 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dojo-border bg-dojo-surface">
        {rows.map((row) => {
          const isEditing = editingId === row.id;

          return (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-dojo-white">
                {row.targetBeltLabel}
              </td>
              <td className="px-4 py-3 tabular-nums text-dojo-white">
                {isEditing ? (
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={draftAttendance}
                    onChange={(event) => setDraftAttendance(event.target.value)}
                    className={NUMBER_INPUT_CLASS}
                    aria-label={`Required attendance for ${row.targetBeltLabel}`}
                  />
                ) : (
                  row.requiredAttendance
                )}
              </td>
              <td className="px-4 py-3 text-dojo-white">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={draftMonths}
                      onChange={(event) => setDraftMonths(event.target.value)}
                      className={NUMBER_INPUT_CLASS}
                      aria-label={`Required months for ${row.targetBeltLabel}`}
                    />
                    <span className="text-xs text-dojo-muted">months</span>
                  </div>
                ) : (
                  <>
                    {row.requiredMonths} month{row.requiredMonths === 1 ? "" : "s"}
                  </>
                )}
              </td>
              <td className="px-4 py-3">
                <ActionButtons
                  isEditing={isEditing}
                  isPending={isPending && isEditing}
                  onEdit={() => startEdit(row)}
                  onSave={() => saveEdit(row.id)}
                  onCancel={cancelEdit}
                />
                {isEditing && rowError ? (
                  <p className="mt-2 text-xs text-dojo-red">{rowError}</p>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </RequirementsTable>
  );
}

function JuniorRequirementsTable({
  clubSlug,
  rows,
}: {
  clubSlug: string;
  rows: JuniorBeltRequirementRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAttendance, setDraftAttendance] = useState("");
  const [draftWeeks, setDraftWeeks] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  const startEdit = (row: JuniorBeltRequirementRow) => {
    setRowError(null);
    setEditingId(row.id);
    setDraftAttendance(String(row.requiredAttendance));
    setDraftWeeks(String(row.requiredWeeks));
  };

  const cancelEdit = () => {
    setRowError(null);
    setEditingId(null);
    setDraftAttendance("");
    setDraftWeeks("");
  };

  const saveEdit = (requirementId: string) => {
    setRowError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("requirementId", requirementId);
    formData.set("requiredAttendance", draftAttendance);
    formData.set("requiredWeeks", draftWeeks);

    startTransition(async () => {
      try {
        await updateJuniorBeltRequirementAction(formData);
        cancelEdit();
        router.refresh();
      } catch (error) {
        setRowError(
          error instanceof Error ? error.message : "Unable to save changes.",
        );
      }
    });
  };

  return (
    <RequirementsTable>
      <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted">
        <tr>
          <th className="px-4 py-3 font-semibold">From belt</th>
          <th className="px-4 py-3 font-semibold">To belt</th>
          <th className="px-4 py-3 font-semibold">Required attendance</th>
          <th className="px-4 py-3 font-semibold">Required time</th>
          <th className="px-4 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dojo-border bg-dojo-surface">
        {rows.map((row) => {
          const isEditing = editingId === row.id;

          return (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-dojo-white">
                {row.fromBeltLabel}
              </td>
              <td className="px-4 py-3 font-medium text-dojo-white">
                {row.toBeltLabel}
              </td>
              <td className="px-4 py-3 tabular-nums text-dojo-white">
                {isEditing ? (
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={draftAttendance}
                    onChange={(event) => setDraftAttendance(event.target.value)}
                    className={NUMBER_INPUT_CLASS}
                    aria-label={`Required attendance from ${row.fromBeltLabel}`}
                  />
                ) : (
                  row.requiredAttendance
                )}
              </td>
              <td className="px-4 py-3 text-dojo-white">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={draftWeeks}
                      onChange={(event) => setDraftWeeks(event.target.value)}
                      className={NUMBER_INPUT_CLASS}
                      aria-label={`Required weeks from ${row.fromBeltLabel}`}
                    />
                    <span className="text-xs text-dojo-muted">weeks</span>
                  </div>
                ) : (
                  <>
                    {row.requiredWeeks} week{row.requiredWeeks === 1 ? "" : "s"}
                  </>
                )}
              </td>
              <td className="px-4 py-3">
                <ActionButtons
                  isEditing={isEditing}
                  isPending={isPending && isEditing}
                  onEdit={() => startEdit(row)}
                  onSave={() => saveEdit(row.id)}
                  onCancel={cancelEdit}
                />
                {isEditing && rowError ? (
                  <p className="mt-2 text-xs text-dojo-red">{rowError}</p>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </RequirementsTable>
  );
}

export function BeltManagementView({
  clubSlug,
  adultRequirements,
  juniorRequirements,
}: BeltManagementViewProps) {
  const [tab, setTab] = useState<BeltManagementTab>("adult");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("adult")}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            tab === "adult"
              ? "border-dojo-red bg-dojo-red text-dojo-white"
              : "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50"
          }`}
        >
          Adult Belts
        </button>
        <button
          type="button"
          onClick={() => setTab("junior")}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            tab === "junior"
              ? "border-dojo-red bg-dojo-red text-dojo-white"
              : "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50"
          }`}
        >
          Junior Belts
        </button>
      </div>

      <p className="text-xs text-dojo-muted">
        Edit attendance and time requirements used for promotion eligibility at
        this club. Changes apply immediately to promotion checks.
      </p>

      {tab === "adult" ? (
        <section aria-label="Adult belt requirements" className="space-y-3">
          {adultRequirements.length === 0 ? (
            <EmptyRequirementsMessage message="No adult grading requirements are configured for this club." />
          ) : (
            <AdultRequirementsTable clubSlug={clubSlug} rows={adultRequirements} />
          )}
        </section>
      ) : (
        <section aria-label="Junior belt requirements" className="space-y-3">
          {juniorRequirements.length === 0 ? (
            <EmptyRequirementsMessage message="No junior grading requirements are configured for this club." />
          ) : (
            <JuniorRequirementsTable clubSlug={clubSlug} rows={juniorRequirements} />
          )}
        </section>
      )}
    </div>
  );
}
