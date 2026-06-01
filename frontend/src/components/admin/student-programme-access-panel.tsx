"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateStudentProgrammeAccessAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import {
  ProfileSectionHeading,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import type { AdminStudentProgrammeAccessSummary } from "@/lib/admin-student-profile.shared";

interface StudentProgrammeAccessPanelProps {
  clubSlug: string;
  userId: string;
  programmeAccess: AdminStudentProgrammeAccessSummary;
}

const saveButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

export function StudentProgrammeAccessPanel({
  clubSlug,
  userId,
  programmeAccess,
}: StudentProgrammeAccessPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState(() =>
    programmeAccess.programmes
      .filter((programme) => programme.hasAccess)
      .map((programme) => programme.programmeId),
  );

  useEffect(() => {
    setSelectedProgrammeIds(
      programmeAccess.programmes
        .filter((programme) => programme.hasAccess)
        .map((programme) => programme.programmeId),
    );
  }, [programmeAccess]);

  if (!programmeAccess.available) {
    return null;
  }

  const toggleProgramme = (programmeId: string, checked: boolean) => {
    setSelectedProgrammeIds((current) => {
      if (checked) {
        return current.includes(programmeId)
          ? current
          : [...current, programmeId];
      }

      return current.filter((id) => id !== programmeId);
    });
  };

  const submitProgrammeAccess = () => {
    setMessage(null);

    if (selectedProgrammeIds.length === 0) {
      setMessage("Select at least one programme for programme access.");
      return;
    }

    startTransition(async () => {
      try {
        await updateStudentProgrammeAccessAction(
          clubSlug,
          userId,
          selectedProgrammeIds,
        );
        setMessage("Programme access updated.");
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to update programme access.",
        );
      }
    });
  };

  return (
    <section className={profileSectionClassName}>
      <ProfileSectionHeading
        title="Programme Access"
        description="Choose which programmes this student belongs to and can book."
      />

      {programmeAccess.programmes.length === 0 ? (
        <p className="text-sm text-dojo-muted">No programmes configured for this club.</p>
      ) : (
        <div className="space-y-2">
          <ul className="space-y-2">
            {programmeAccess.programmes.map((programme) => {
              const checked = selectedProgrammeIds.includes(programme.programmeId);

              return (
                <li key={programme.programmeId}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white transition hover:border-dojo-red/30">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red"
                      checked={checked}
                      disabled={isPending}
                      onChange={(event) =>
                        toggleProgramme(programme.programmeId, event.target.checked)
                      }
                    />
                    <span>{programme.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={saveButtonClassName}
              disabled={isPending}
              onClick={submitProgrammeAccess}
            >
              {isPending ? "Saving…" : "Save Programme Access"}
            </button>
            {message ? (
              <p className="text-xs text-dojo-muted" role="status">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
