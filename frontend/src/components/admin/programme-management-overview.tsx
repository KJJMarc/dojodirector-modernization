import Link from "next/link";
import {
  clubProgrammeAdminPath,
  formatProgrammeTypeOptionLabel,
  type AdminProgramme,
} from "@/lib/admin-programmes.shared";

interface ProgrammeManagementOverviewProps {
  clubSlug: string;
  programmes: AdminProgramme[];
}

function FeatureSummary({ programme }: { programme: AdminProgramme }) {
  const enabledFeatures = [
    programme.attendanceTrackingEnabled && "Attendance",
    programme.attendanceCardsEnabled && "Cards",
    programme.gradingSystemEnabled && "Grading",
    programme.beltsRanksEnabled && "Belts",
    programme.retentionTrackingEnabled && "Retention",
    programme.studentPortalAccessEnabled && "Portal",
    programme.classBookingEnabled && "Booking",
    programme.promotionCandidatesEnabled && "Promotions",
  ].filter(Boolean);

  return (
    <p className="text-xs text-dojo-muted">
      {enabledFeatures.length > 0
        ? enabledFeatures.join(" · ")
        : "No features enabled"}
    </p>
  );
}

export function ProgrammeManagementOverview({
  clubSlug,
  programmes,
}: ProgrammeManagementOverviewProps) {
  if (programmes.length === 0) {
    return (
      <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
        No programmes configured yet. Use Create New Programme above to add your
        first programme area.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {programmes.map((programme) => (
        <article
          key={programme.id}
          className="rounded-xl border border-dojo-border bg-dojo-surface p-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-dojo-white">
                  {programme.name}
                </h3>
                {!programme.isActive ? (
                  <span className="rounded-full bg-dojo-muted/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dojo-muted">
                    Inactive
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-dojo-muted">
                Type: {formatProgrammeTypeOptionLabel(programme.programmeType)} ·{" "}
                {programme.studentCount} active{" "}
                {programme.studentCount === 1 ? "member" : "members"}
              </p>
              <FeatureSummary programme={programme} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={clubProgrammeAdminPath(clubSlug, programme.slug)}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
              >
                Settings
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
