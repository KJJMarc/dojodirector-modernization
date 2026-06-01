import type { Metadata } from "next";
import Link from "next/link";
import { ManageBookingsHub } from "@/components/admin/manage-bookings-hub";
import { AppHeader } from "@/components/layout/app-header";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ManageBookingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ManageBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Manage Bookings`,
    description: `Manage attendance and bookings for ${club.name}.`,
  };
}

export default async function ManageBookingsPage({ params }: ManageBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Manage Bookings" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug)}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Admin Dashboard
      </Link>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          BOOKING TOOLS
        </h2>
        <p className="text-sm text-dojo-muted">
          Mark attendance, make block bookings, or cancel upcoming session bookings.
        </p>
        <ManageBookingsHub clubSlug={club.slug} />
      </section>
    </main>
  );
}
