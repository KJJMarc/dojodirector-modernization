import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { MakeBookingsScheduleList } from "@/components/admin/make-bookings-schedule-list";
import { AppHeader } from "@/components/layout/app-header";
import { getRecurringClassSchedules } from "@/lib/admin-recurring-classes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface MakeBookingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: MakeBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Make Bookings`,
    description: `Block-book students onto recurring classes for ${club.name}.`,
  };
}

export default async function MakeBookingsPage({ params }: MakeBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const schedules = await getRecurringClassSchedules(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Make Bookings" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "bookings")} className={adminNavLinkClassName}>
          ← Back to Manage Bookings
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Choose a recurring class to block-book a student across upcoming sessions,
        or manage existing bookings for that slot.
      </p>

      <MakeBookingsScheduleList clubSlug={club.slug} schedules={schedules} />
    </main>
  );
}
