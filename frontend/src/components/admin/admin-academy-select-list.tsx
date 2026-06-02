import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";

interface AdminAcademyOption {
  clubId: string;
  clubSlug: string;
  clubName: string;
}

interface AdminAcademySelectListProps {
  academies: AdminAcademyOption[];
}

export function AdminAcademySelectList({ academies }: AdminAcademySelectListProps) {
  if (academies.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No academy admin access found.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {academies.map((academy) => (
        <li key={academy.clubId}>
          <Link
            href={clubAdminPath(academy.clubSlug)}
            className="flex min-h-[72px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
          >
            <span className="text-base font-semibold text-dojo-white">{academy.clubName}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
