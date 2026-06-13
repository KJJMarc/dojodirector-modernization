"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DeleteProgrammeActionResult } from "@/app/admin/[clubSlug]/programmes/[programmeSlug]/actions";
import {
  type AdminProgramme,
  type ProgrammeDeleteEligibility,
} from "@/lib/admin-programmes.shared";

const DANGER_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-50";

const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

interface ProgrammeDeleteSectionProps {
  clubSlug: string;
  programme: AdminProgramme;
  eligibility: ProgrammeDeleteEligibility;
  action: (formData: FormData) => Promise<DeleteProgrammeActionResult>;
}

export function ProgrammeDeleteSection({
  clubSlug,
  programme,
  eligibility,
  action,
}: ProgrammeDeleteSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");

  const handleDelete = () => {
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("programmeSlug", programme.slug);
    formData.set("confirmationName", confirmationName);

    startTransition(async () => {
      const result = await action(formData);

      if (result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (result.error) {
        setError(result.error);
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
        Delete programme
      </h2>

      {!eligibility.canDelete ? (
        <div className="space-y-2">
          <p className="text-sm text-dojo-muted">
            This programme cannot be deleted because linked academy data still
            exists:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-dojo-muted">
            {eligibility.blockedReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : showDeleteConfirm ? (
        <div className="space-y-3">
          <p className="text-sm text-dojo-white">
            Permanently delete{" "}
            <span className="font-semibold">{programme.name}</span>? This cannot
            be undone.
          </p>
          <div className="space-y-2">
            <label
              htmlFor="programmeDeleteConfirmation"
              className="block text-sm font-medium text-dojo-white"
            >
              Type {programme.name} to confirm
            </label>
            <input
              id="programmeDeleteConfirmation"
              type="text"
              value={confirmationName}
              disabled={isPending}
              onChange={(event) => setConfirmationName(event.target.value)}
              className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white"
              autoComplete="off"
            />
          </div>
          {error ? (
            <p className="text-sm text-dojo-red" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                isPending || confirmationName.trim() !== programme.name.trim()
              }
              onClick={handleDelete}
              className={DANGER_BUTTON_CLASS}
            >
              {isPending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowDeleteConfirm(false);
                setConfirmationName("");
                setError(null);
              }}
              className={SECONDARY_BUTTON_CLASS}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-dojo-muted">
            Permanently remove this programme from Programme Management. This is
            only available when no students, classes, sessions, or belt systems
            are linked.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowDeleteConfirm(true)}
            className={DANGER_BUTTON_CLASS}
          >
            Delete Programme
          </button>
        </div>
      )}
    </section>
  );
}
