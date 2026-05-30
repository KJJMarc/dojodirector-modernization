import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionBookingsManager } from "@/components/admin/session-bookings-manager";
import { AppHeader } from "@/components/layout/app-header";
import {
  getAdminSessionBookingsPageData,
  getBookingStudentOptions,
} from "@/lib/admin-session-bookings.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Session bookings",
  description: "Manage bookings for a class session.",
};

interface SessionBookingsPageProps {
  params: { sessionId: string };
}

export default async function SessionBookingsPage({
  params,
}: SessionBookingsPageProps) {
  let pageData;
  let students;

  try {
    [pageData, students] = await Promise.all([
      getAdminSessionBookingsPageData(params.sessionId),
      getBookingStudentOptions(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "Class session not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Session bookings" />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/classes"
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to classes
        </Link>
        <Link
          href={`/admin/classes/sessions/${params.sessionId}/edit`}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          Edit session
        </Link>
        <Link
          href={`/attendance/${params.sessionId}`}
          className="text-sm font-medium text-dojo-red transition hover:text-dojo-red-hover"
        >
          Attendance register →
        </Link>
      </div>

      <SessionBookingsManager pageData={pageData} students={students} />
    </main>
  );
}
