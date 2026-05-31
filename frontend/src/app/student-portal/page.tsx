import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalLoginScreen } from "@/components/student-portal/student-portal-login-screen";
import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";
import { StudentPortalUnlinkedProfile } from "@/components/student-portal/student-portal-unlinked-profile";
import { StudentPortalView } from "@/components/student-portal/student-portal-view";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { hasAcceptedCurrentStudentAgreements } from "@/lib/student-portal-agreements.server";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
import { getStudentPortalPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | My Portal",
  description: "Sign in to your member portal.",
};

export default async function StudentPortalEntryPage() {
  const session = await resolveStudentPortalSessionState();

  if (session.status === "signed_out") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="My Portal" clubName={ACTIVE_CLUB_NAME} />

        <StudentPortalHomeLink />

        <StudentPortalLoginScreen />
      </main>
    );
  }

  if (session.status === "unlinked") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="My Portal" clubName={ACTIVE_CLUB_NAME} />

        <StudentPortalHomeLink />

        <StudentPortalUnlinkedProfile />
      </main>
    );
  }

  const { profile } = session;
  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    profile.userId,
    { logContext: "StudentPortalEntryPage.guard" },
  );

  if (!agreementsComplete) {
    redirect("/student-portal/agreements");
  }

  const pageData = await getStudentPortalPageData(
    profile.userId,
    new Date().getFullYear(),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="My Portal" clubName={ACTIVE_CLUB_NAME} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StudentPortalHomeLink />
        <StudentPortalSignOutButton />
      </div>

      <StudentPortalView
        userId={profile.userId}
        pageData={pageData}
        year={new Date().getFullYear()}
      />
    </main>
  );
}
