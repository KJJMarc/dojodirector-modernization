import Link from "next/link";
import {
  formatProgrammeStudentsLabel,
  programmeStudentsAdminPath,
  type AdminProgramme,
} from "@/lib/admin-programmes.shared";

interface ProgrammeStudentAreasCardsProps {
  clubSlug: string;
  programmes: AdminProgramme[];
}

export function ProgrammeStudentAreasCards({
  clubSlug,
  programmes,
}: ProgrammeStudentAreasCardsProps) {
  const activeProgrammes = programmes.filter((programme) => programme.isActive);

  if (activeProgrammes.length === 0) {
    return (
      <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
        No programme student areas are available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {activeProgrammes.map((programme) => (
        <Link
          key={programme.id}
          href={programmeStudentsAdminPath(clubSlug, programme.slug)}
          className="flex min-h-[72px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
        >
          <span className="text-base font-semibold text-dojo-white">
            {formatProgrammeStudentsLabel(programme)}
          </span>
          <span className="mt-0.5 text-xs text-dojo-muted">
            {programme.studentCount} active{" "}
            {programme.studentCount === 1 ? "member" : "members"}
          </span>
        </Link>
      ))}
    </div>
  );
}
