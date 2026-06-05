import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { RecurringScheduleBookingsManager } from "@/components/admin/recurring-schedule-bookings-manager";
import { AppHeader } from "@/components/layout/app-header";
import {
  getBookingStudentOptions,
  getRecurringScheduleBookingsPageData,
} from "@/lib/admin-session-bookings.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface MakeBookingsSchedulePageProps {
  params: { clubSlug: string; scheduleId: string };
}

export async function generateMetadata({
  params,
}: MakeBookingsSchedulePageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Make Bookings`,
    description: `Make bookings for a recurring class at ${club.name}.`,
  };
}

export default async function MakeBookingsSchedulePage({
  params,
}: MakeBookingsSchedulePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;
  let students;

  try {
    pageData = await getRecurringScheduleBookingsPageData(params.scheduleId, club.id);
    students = await getBookingStudentOptions(club.id, {
      programmeType: pageData.schedule.programmeType,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Recurring class schedule not found."
    ) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Make Bookings" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "bookings/make")} className={adminNavLinkClassName}>
          ← Back to Make Bookings
        </Link>
      </AdminNavLinks>

      <RecurringScheduleBookingsManager
        clubSlug={club.slug}
        pageData={pageData}
        students={students}
      />
    </main>
  );
}
