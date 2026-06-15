import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { AdminClassSessionsList } from "@/components/admin/admin-class-sessions-list";
import { RecurringClassesList } from "@/components/admin/recurring-classes-list";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminUpcomingClassSessions } from "@/lib/admin-class-sessions";
import { getRecurringClassSchedules } from "@/lib/admin-recurring-classes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAdminClassesEditPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubAdminClassesEditPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Edit Classes`,
    description: `Manage recurring classes and one-off events for ${club.name}.`,
  };
}

export default async function ClubAdminClassesEditPage({
  params,
}: ClubAdminClassesEditPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const schedules = await getRecurringClassSchedules(club.id);
  const sessions = await getAdminUpcomingClassSessions(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Edit / Update Classes" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="flex flex-wrap gap-2">
        <Link
          href={clubAdminPath(club.slug, "classes/new")}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Add Recurring Class
        </Link>
        <Link
          href={clubAdminPath(club.slug, "classes/new-event")}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
        >
          Add One-Off Event
        </Link>
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            RECURRING CLASSES
            {schedules.length > 0 ? (
              <span className="ml-2 font-normal normal-case text-dojo-muted">
                ({schedules.length} slots)
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Weekly templates such as Beginners Jiu Jitsu, Muay Thai and Strength
            &amp; Conditioning. Open Edit to change details, deactivate, or delete.
          </p>
        </div>

        <RecurringClassesList clubSlug={club.slug} schedules={schedules} />
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            UPCOMING SESSIONS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Recurring sessions and one-off events for the next 8 weeks. Cancel,
            reinstate, or edit individual sessions.
          </p>
        </div>

        <AdminClassSessionsList clubSlug={club.slug} sessions={sessions} />
      </section>
    </main>
  );
}
