import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalBackLink } from "@/components/student-portal/student-portal-back-link";
import { StudentPortalBookingsView } from "@/components/student-portal/student-portal-bookings-view";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getStudentPortalBookingsPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalBookingsPageProps {
  params: { userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalBookingsPageProps): Promise<Metadata> {
  try {
    const pageData = await getStudentPortalBookingsPageData(params.userId);

    return {
      title: `DojoDirector | Upcoming Bookings — ${pageData.studentName}`,
      description: `Upcoming class bookings for ${pageData.studentName}.`,
    };
  } catch {
    return {
      title: "DojoDirector | Upcoming Bookings",
      description: "View your upcoming class bookings.",
    };
  }
}

export default async function StudentPortalBookingsPage({
  params,
}: StudentPortalBookingsPageProps) {
  let pageData;

  try {
    pageData = await getStudentPortalBookingsPageData(params.userId);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Upcoming Bookings" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalBackLink userId={params.userId} />

      <StudentPortalBookingsView pageData={pageData} />

      <StudentPortalHomeLink />
    </main>
  );
}
