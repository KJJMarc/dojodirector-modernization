import Link from "next/link";
import { academySelectAccessLabel } from "@/lib/portal-academy-access.shared";
import type { AcademySelectOption } from "@/lib/portal-academy-access.shared";

interface AdminAcademySelectListProps {
  academies: AcademySelectOption[];
}

export function AdminAcademySelectList({ academies }: AdminAcademySelectListProps) {
  if (academies.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No academy access found.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {academies.map((academy) => (
        <li
          key={academy.clubId}
          className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-semibold text-dojo-white">{academy.clubName}</p>
              <p className="mt-0.5 text-xs text-dojo-muted">
                {academySelectAccessLabel(academy.accessKind)}
              </p>
            </div>
            <Link
              href={academy.href}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-dojo-red/60 bg-dojo-red/10 px-4 py-2.5 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 active:scale-[0.99]"
            >
              Enter Academy
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
