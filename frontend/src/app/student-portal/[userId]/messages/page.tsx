import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalBackLink } from "@/components/student-portal/student-portal-back-link";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalMessagesPlaceholder } from "@/components/student-portal/student-portal-messages-placeholder";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getStudentPortalPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalMessagesPageProps {
  params: { userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalMessagesPageProps): Promise<Metadata> {
  try {
    const pageData = await getStudentPortalPageData(
      params.userId,
      new Date().getFullYear(),
    );

    return {
      title: `DojoDirector | Messages — ${pageData.studentName}`,
      description: `Messages for ${pageData.studentName}.`,
    };
  } catch {
    return {
      title: "DojoDirector | Messages",
      description: "Member messages.",
    };
  }
}

export default async function StudentPortalMessagesPage({
  params,
}: StudentPortalMessagesPageProps) {
  try {
    await getStudentPortalPageData(params.userId, new Date().getFullYear());
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Messages" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalBackLink userId={params.userId} />

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            MESSAGES
          </h2>
        </div>

        <StudentPortalMessagesPlaceholder />
      </section>

      <StudentPortalHomeLink />
    </main>
  );
}
