"use client";

import Link from "next/link";
import type { ClubRow } from "@/lib/clubs.shared";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";

interface InstructorPortalAcademySelectorProps {
  clubs: ClubRow[];
}

export function InstructorPortalAcademySelector({
  clubs,
}: InstructorPortalAcademySelectorProps) {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          SELECT ACADEMY
        </h2>
        <p className="mt-1 text-sm text-dojo-muted">
          Choose which academy you want to open in the instructor portal.
        </p>
      </div>

      <div className="grid gap-3">
        {clubs.map((club) => (
          <Link
            key={club.id}
            href={instructorPortalClubPath(club.slug)}
            className="flex min-h-[72px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 py-3 text-left transition hover:border-dojo-red/50 hover:bg-dojo-surface active:scale-[0.99]"
          >
            <span className="text-base font-semibold text-dojo-white">{club.name}</span>
            <span className="mt-0.5 text-xs text-dojo-muted">Open instructor portal</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
