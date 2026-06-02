"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  updateStudentProgrammeBookingAccessAction,
  updateStudentProgrammeMembershipAction,
} from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import {
  ProfileSectionHeading,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import type {
  AdminStudentProgrammeAccessSummary,
  AdminStudentProgrammeMembershipSummary,
} from "@/lib/admin-student-profile.shared";
import { programmeBookingAccessLabel, programmeStudentAreaLabel } from "@/lib/admin-programmes.shared";
import type { StudentPortalAccessProgrammeType } from "@/lib/admin-programmes.shared";

interface StudentProgrammeAccessPanelProps {
  clubSlug: string;
  userId: string;
  programmeMembership: AdminStudentProgrammeMembershipSummary;
  programmeBookingAccess: AdminStudentProgrammeAccessSummary;
}

const saveButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

function ProgrammeCheckboxList({
  programmes,
  selectedProgrammeIds,
  isPending,
  getLabel,
  onToggle,
}: {
  programmes: {
    programmeId: string;
    programmeType?: string;
    name: string;
  }[];
  selectedProgrammeIds: string[];
  isPending: boolean;
  getLabel: (programme: {
    programmeId: string;
    programmeType?: string;
    name: string;
  }) => string;
  onToggle: (programmeId: string, checked: boolean) => void;
}) {
  return (
    <ul className="space-y-2">
      {programmes.map((programme) => {
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
                  onToggle(programme.programmeId, event.target.checked)
                }
              />
              <span>{getLabel(programme)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function StudentProgrammeAccessPanel({
  clubSlug,
  userId,
  programmeMembership,
  programmeBookingAccess,
}: StudentProgrammeAccessPanelProps) {
  const router = useRouter();
  const [membershipPending, startMembershipTransition] = useTransition();
  const [bookingPending, startBookingTransition] = useTransition();
  const [membershipMessage, setMembershipMessage] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [selectedMembershipIds, setSelectedMembershipIds] = useState(() =>
    programmeMembership.programmes
      .filter((programme) => programme.isMember)
      .map((programme) => programme.programmeId),
  );
  const [selectedBookingIds, setSelectedBookingIds] = useState(() =>
    programmeBookingAccess.programmes
      .filter((programme) => programme.hasAccess)
      .map((programme) => programme.programmeId),
  );

  useEffect(() => {
    setSelectedMembershipIds(
      programmeMembership.programmes
        .filter((programme) => programme.isMember)
        .map((programme) => programme.programmeId),
    );
  }, [programmeMembership]);

  useEffect(() => {
    setSelectedBookingIds(
      programmeBookingAccess.programmes
        .filter((programme) => programme.hasAccess)
        .map((programme) => programme.programmeId),
    );
  }, [programmeBookingAccess]);

  if (!programmeMembership.available && !programmeBookingAccess.available) {
    return null;
  }

  const toggleMembership = (programmeId: string, checked: boolean) => {
    setSelectedMembershipIds((current) => {
      if (checked) {
        return current.includes(programmeId) ? current : [...current, programmeId];
      }

      return current.filter((id) => id !== programmeId);
    });
  };

  const toggleBooking = (programmeId: string, checked: boolean) => {
    setSelectedBookingIds((current) => {
      if (checked) {
        return current.includes(programmeId) ? current : [...current, programmeId];
      }

      return current.filter((id) => id !== programmeId);
    });
  };

  const submitMembership = () => {
    setMembershipMessage(null);

    if (selectedMembershipIds.length === 0) {
      setMembershipMessage("Select at least one programme student area.");
      return;
    }

    startMembershipTransition(async () => {
      try {
        await updateStudentProgrammeMembershipAction(
          clubSlug,
          userId,
          selectedMembershipIds,
        );
        setMembershipMessage("Programme student areas updated.");
        router.refresh();
      } catch (error) {
        setMembershipMessage(
          error instanceof Error
            ? error.message
            : "Unable to update programme student areas.",
        );
      }
    });
  };

  const submitBookingAccess = () => {
    setBookingMessage(null);

    if (selectedBookingIds.length === 0) {
      setBookingMessage("Select at least one programme for booking access.");
      return;
    }

    startBookingTransition(async () => {
      try {
        await updateStudentProgrammeBookingAccessAction(
          clubSlug,
          userId,
          selectedBookingIds,
        );
        setBookingMessage("Booking access updated.");
        router.refresh();
      } catch (error) {
        setBookingMessage(
          error instanceof Error
            ? error.message
            : "Unable to update booking access.",
        );
      }
    });
  };

  const membershipLabel = (programme: {
    programmeType?: string;
    name: string;
  }) =>
    programme.programmeType
      ? programmeStudentAreaLabel(
          programme.programmeType as StudentPortalAccessProgrammeType,
        )
      : `${programme.name} Student`;

  const bookingLabel = (programme: {
    programmeType?: string;
    name: string;
  }) => {
    const membershipMatch = programmeMembership.programmes.find(
      (item) => item.name === programme.name,
    );

    if (membershipMatch?.programmeType) {
      return programmeBookingAccessLabel(
        membershipMatch.programmeType as StudentPortalAccessProgrammeType,
      );
    }

    return `${programme.name} Classes`;
  };

  return (
    <>
      {programmeMembership.available ? (
        <section className={profileSectionClassName}>
          <ProfileSectionHeading
            title="Programme Student Areas"
            description="Choose which programme student lists include this student."
          />

          {programmeMembership.programmes.length === 0 ? (
            <p className="text-sm text-dojo-muted">No programmes configured for this club.</p>
          ) : (
            <div className="space-y-2">
              <ProgrammeCheckboxList
                programmes={programmeMembership.programmes}
                selectedProgrammeIds={selectedMembershipIds}
                isPending={membershipPending}
                getLabel={(programme) =>
                  membershipLabel(programme) ?? `${programme.name} Student`
                }
                onToggle={toggleMembership}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={saveButtonClassName}
                  disabled={membershipPending}
                  onClick={submitMembership}
                >
                  {membershipPending ? "Saving…" : "Save Student Areas"}
                </button>
                {membershipMessage ? (
                  <p className="text-xs text-dojo-muted" role="status">
                    {membershipMessage}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {programmeBookingAccess.available ? (
        <section className={profileSectionClassName}>
          <ProfileSectionHeading
            title="Booking Access"
            description="Choose which programme classes this student can book through the student portal."
          />

          {programmeBookingAccess.programmes.length === 0 ? (
            <p className="text-sm text-dojo-muted">No programmes configured for this club.</p>
          ) : (
            <div className="space-y-2">
              <ProgrammeCheckboxList
                programmes={programmeBookingAccess.programmes.map((programme) => {
                  const membershipMatch = programmeMembership.programmes.find(
                    (item) => item.programmeId === programme.programmeId,
                  );

                  return {
                    ...programme,
                    programmeType: membershipMatch?.programmeType,
                  };
                })}
                selectedProgrammeIds={selectedBookingIds}
                isPending={bookingPending}
                getLabel={bookingLabel}
                onToggle={toggleBooking}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={saveButtonClassName}
                  disabled={bookingPending}
                  onClick={submitBookingAccess}
                >
                  {bookingPending ? "Saving…" : "Save Booking Access"}
                </button>
                {bookingMessage ? (
                  <p className="text-xs text-dojo-muted" role="status">
                    {bookingMessage}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
