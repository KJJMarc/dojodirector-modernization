import type { Metadata } from "next";
import Link from "next/link";
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

interface ClubRecurringScheduleBookingsPageProps {
  params: { clubSlug: string; scheduleId: string };
}

export async function generateMetadata({
  params,
}: ClubRecurringScheduleBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Recurring class bookings`,
    description: `Manage recurring class bookings for ${club.name}.`,
  };
}

export default async function ClubRecurringScheduleBookingsPage({
  params,
}: ClubRecurringScheduleBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;
  let students;

  try {
    [pageData, students] = await Promise.all([
      getRecurringScheduleBookingsPageData(params.scheduleId, club.id),
      getBookingStudentOptions(club.id),
    ]);
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
      <AppHeader pageTitle="Manage Bookings" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug, "classes")}
        className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Manage Classes
      </Link>

      <RecurringScheduleBookingsManager
        clubSlug={club.slug}
        pageData={pageData}
        students={students}
      />
    </main>
  );
}
