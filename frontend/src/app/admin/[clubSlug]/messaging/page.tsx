import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface AdminMessagingPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: AdminMessagingPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Messaging`,
    description: `Messaging for ${club.name}.`,
  };
}

export default async function AdminMessagingPage({
  params,
}: AdminMessagingPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Messaging" clubName={club.name} />

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center">
        <h2 className="text-xl font-semibold text-dojo-white">Messaging</h2>
        <p className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Coming soon
        </p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-dojo-muted">
          This area will allow admins to send messages to students, instructors,
          classes and retention-risk groups.
        </p>
        <Link
          href={clubAdminPath(club.slug)}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
        >
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
