import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { RecurringScheduleBookingsClientForms } from "@/components/admin/recurring-schedule-bookings-client-forms";
import { RecurringScheduleBookingsSummary } from "@/components/admin/recurring-schedule-bookings-summary";
import { RecurringScheduleBookingsTable } from "@/components/admin/recurring-schedule-bookings-table";
import { AppHeader } from "@/components/layout/app-header";
import {
  getBookingStudentOptions,
  getRecurringScheduleBookingsPageData,
} from "@/lib/admin-session-bookings.server";
import {
  sanitizeBookingStudentOptions,
  sanitizeRecurringScheduleBookingsPageData,
} from "@/lib/admin-session-bookings.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface MakeBookingsSchedulePageProps {
  params: { clubSlug: string; scheduleId: string };
}

export async function generateMetadata({
  params,
}: MakeBookingsSchedulePageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Make Bookings`,
    description: `Make bookings for a recurring class at ${club.name}.`,
  };
}

function SectionFallback({ label }: { label: string }) {
  return (
    <section className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 p-4">
      <p className="text-sm text-dojo-red">
        Unable to load {label}. Please refresh the page.
      </p>
    </section>
  );
}

export default async function MakeBookingsSchedulePage({
  params,
}: MakeBookingsSchedulePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;
  let students;

  try {
    pageData = sanitizeRecurringScheduleBookingsPageData(
      await getRecurringScheduleBookingsPageData(params.scheduleId, club.id),
    );
    students = sanitizeBookingStudentOptions(
      await getBookingStudentOptions(club.id, {
        programmeType: pageData.schedule.programmeType,
      }),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Recurring class schedule not found."
    ) {
      notFound();
    }

    console.error(
      "[MakeBookingsSchedulePage] Failed to load recurring booking page data",
      {
        clubSlug: params.clubSlug,
        scheduleId: params.scheduleId,
        error,
      },
    );
    throw error;
  }

  let summarySection: ReactNode;
  let tableSection: ReactNode;

  try {
    summarySection = <RecurringScheduleBookingsSummary pageData={pageData} />;
  } catch (error) {
    console.error(
      "[MakeBookingsSchedulePage] Failed to render booking summary section",
      {
        clubSlug: params.clubSlug,
        scheduleId: params.scheduleId,
        error,
      },
    );
    summarySection = <SectionFallback label="class summary" />;
  }

  try {
    tableSection = (
      <RecurringScheduleBookingsTable studentBookings={pageData.studentBookings} />
    );
  } catch (error) {
    console.error(
      "[MakeBookingsSchedulePage] Failed to render bookings table section",
      {
        clubSlug: params.clubSlug,
        scheduleId: params.scheduleId,
        error,
      },
    );
    tableSection = <SectionFallback label="future bookings table" />;
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

      <div className="space-y-6">
        {summarySection}
        {tableSection}
        <RecurringScheduleBookingsClientForms
          clubSlug={club.slug}
          pageData={pageData}
          students={students}
        />
      </div>
    </main>
  );
}
