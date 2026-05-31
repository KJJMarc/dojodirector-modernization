import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalBackLink } from "@/components/student-portal/student-portal-back-link";
import { StudentPortalBookClass } from "@/components/student-portal/student-portal-book-class";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getStudentPortalBookPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalBookPageProps {
  params: { userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalBookPageProps): Promise<Metadata> {
  try {
    const pageData = await getStudentPortalBookPageData(params.userId);

    return {
      title: `DojoDirector | Book a Class — ${pageData.studentName}`,
      description: `Book upcoming classes for ${pageData.studentName}.`,
    };
  } catch {
    return {
      title: "DojoDirector | Book a Class",
      description: "Book upcoming class sessions.",
    };
  }
}

export default async function StudentPortalBookPage({
  params,
}: StudentPortalBookPageProps) {
  let pageData;

  try {
    pageData = await getStudentPortalBookPageData(params.userId);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Book a Class" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalBackLink userId={params.userId} />

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            UPCOMING SESSIONS
          </h2>
          {pageData.bookableSessionGroups.length > 0 ? (
            <p className="mt-2 text-sm text-dojo-muted">
              Select a class below to book or join the waiting list.
            </p>
          ) : null}
        </div>

        <StudentPortalBookClass
          userId={params.userId}
          sessionGroups={pageData.bookableSessionGroups}
        />
      </section>

      <StudentPortalHomeLink />
    </main>
  );
}
