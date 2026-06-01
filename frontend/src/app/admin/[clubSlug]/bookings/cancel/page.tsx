import type { Metadata } from "next";
import Link from "next/link";
import { CancelBookingsScheduleList } from "@/components/admin/cancel-bookings-schedule-list";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminCancelBookingsSchedulePageData } from "@/lib/admin-manage-bookings.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface CancelBookingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: CancelBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Cancel Bookings`,
    description: `Cancel upcoming student bookings for ${club.name}.`,
  };
}

export default async function CancelBookingsPage({ params }: CancelBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const pageData = await getAdminCancelBookingsSchedulePageData(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Cancel Bookings" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug, "bookings")}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Manage Bookings
      </Link>

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Tap a session to view
        bookings and cancel students.
      </p>

      <CancelBookingsScheduleList clubSlug={club.slug} sessions={pageData.sessions} />
    </main>
  );
}
