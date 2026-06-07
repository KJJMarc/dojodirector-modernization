"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { migrateKidsStudentToAdultProgrammeAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import { ProfileSectionHeading } from "@/components/admin/profile-detail-item";
import { MIGRATE_TO_ADULT_PROGRAMME_DIALOG_MESSAGE } from "@/lib/admin-migrate-kids-to-adult.shared";

interface MigrateToAdultProgrammePanelProps {
  clubSlug: string;
  userId: string;
  studentName: string;
  canMigrate: boolean;
  disabledReason: string | null;
}

const triggerButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

export function MigrateToAdultProgrammePanel({
  clubSlug,
  userId,
  studentName,
  canMigrate,
  disabledReason,
}: MigrateToAdultProgrammePanelProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeDialog = useCallback(() => {
    if (!isPending) {
      setIsDialogOpen(false);
      setErrorMessage(null);
    }
  }, [isPending]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeDialog, isDialogOpen]);

  const submitMigration = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await migrateKidsStudentToAdultProgrammeAction(clubSlug, userId);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setIsDialogOpen(false);
      router.push(result.redirectHref);
      router.refresh();
    });
  };

  if (!canMigrate && !disabledReason) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-xl border border-dojo-border bg-dojo-surface p-3">
      <ProfileSectionHeading
        title="Migrate to Adult Programme"
        description="Move this student from Kingston Jiu Jitsu Kids to Kingston Jiu Jitsu while preserving their profile, attendance and grading history."
      />

      {canMigrate ? (
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className={triggerButtonClassName}
        >
          Migrate to Adult Programme
        </button>
      ) : (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm leading-snug text-dojo-muted">
          {disabledReason}
        </p>
      )}

      {isDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="migrate-to-adult-programme-title"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-dojo-border bg-dojo-surface p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="migrate-to-adult-programme-title"
              className="text-lg font-semibold text-dojo-white"
            >
              Migrate to Adult Programme
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
              {MIGRATE_TO_ADULT_PROGRAMME_DIALOG_MESSAGE}
            </p>
            <p className="mt-3 text-sm font-medium text-dojo-white">{studentName}</p>

            {errorMessage ? (
              <p className="mt-3 text-sm leading-snug text-dojo-red">{errorMessage}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitMigration}
                disabled={isPending}
                className={triggerButtonClassName}
              >
                {isPending ? "Migrating…" : "Confirm migration"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
