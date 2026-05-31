import type { Metadata } from "next";
import Link from "next/link";
import { OneOffEventForm } from "@/components/admin/one-off-event-form";
import { AppHeader } from "@/components/layout/app-header";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubNewEventPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubNewEventPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Add one-off event`,
    description: `Create a one-off class session for ${club.name}.`,
  };
}

export default async function ClubNewEventPage({
  params,
}: ClubNewEventPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add One-Off Event" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug, "classes")}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Manage Classes
      </Link>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            ONE-OFF EVENT
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Creates a single session for seminars, gradings, open mats and other
            special events. Appears on the public booking page and /attendance.
          </p>
        </div>

        <OneOffEventForm clubSlug={club.slug} />
      </section>
    </main>
  );
}
