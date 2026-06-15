import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { EditClassSessionForm } from "@/components/admin/edit-class-session-form";
import { AppHeader } from "@/components/layout/app-header";
import { getEditableClassSession } from "@/lib/admin-class-sessions";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubEditClassSessionPageProps {
  params: { clubSlug: string; sessionId: string };
}

export async function generateMetadata({
  params,
}: ClubEditClassSessionPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Edit Session`,
    description: `Edit a class session for ${club.name}.`,
  };
}

export default async function ClubEditClassSessionPage({
  params,
}: ClubEditClassSessionPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let session;

  try {
    session = await getEditableClassSession(params.sessionId, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Class session not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Edit Session" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "classes/edit")} className={adminNavLinkClassName}>
          ← Back to Edit / Update Classes
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            SESSION DETAILS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Update date, time, capacity, location, programme type or status.
          </p>
        </div>

        <EditClassSessionForm clubSlug={club.slug} session={session} />
      </section>
    </main>
  );
}
