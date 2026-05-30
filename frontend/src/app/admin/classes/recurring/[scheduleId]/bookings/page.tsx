import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecurringScheduleBookingsManager } from "@/components/admin/recurring-schedule-bookings-manager";
import { AppHeader } from "@/components/layout/app-header";
import {
  getBookingStudentOptions,
  getRecurringScheduleBookingsPageData,
} from "@/lib/admin-session-bookings.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Recurring class bookings",
  description: "Manage recurring class bookings for Kingston Jiu Jitsu.",
};

interface RecurringScheduleBookingsPageProps {
  params: { scheduleId: string };
}

export default async function RecurringScheduleBookingsPage({
  params,
}: RecurringScheduleBookingsPageProps) {
  let pageData;
  let students;

  try {
    [pageData, students] = await Promise.all([
      getRecurringScheduleBookingsPageData(params.scheduleId),
      getBookingStudentOptions(),
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
      <AppHeader pageTitle="Manage bookings" />

      <Link
        href="/admin/classes"
        className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to classes
      </Link>

      <RecurringScheduleBookingsManager pageData={pageData} students={students} />
    </main>
  );
}
