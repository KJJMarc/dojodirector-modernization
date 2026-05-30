import Link from "next/link";
import { clubAdminPath } from "@/lib/clubs.shared";
import type { ClubRow } from "@/lib/clubs.shared";

interface SuperAdminClubListProps {
  clubs: ClubRow[];
}

export function SuperAdminClubList({ clubs }: SuperAdminClubListProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Clubs
        </h2>
        <button
          type="button"
          disabled
          className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-muted opacity-60"
        >
          Create new club
        </button>
      </div>

      <p className="text-xs text-dojo-muted">Club creation coming soon.</p>

      {clubs.length === 0 ? (
        <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
          No clubs found.
        </p>
      ) : (
        <ul className="space-y-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <Link
                href={clubAdminPath(club.slug)}
                className="flex min-h-[72px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
              >
                <span className="text-base font-semibold text-dojo-white">{club.name}</span>
                <span className="mt-0.5 text-xs text-dojo-muted">/{club.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
