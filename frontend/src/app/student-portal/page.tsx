import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalAccessDenied } from "@/components/student-portal/student-portal-access-denied";
import { StudentPortalAcademySelector } from "@/components/student-portal/student-portal-academy-selector";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalInactiveMembership } from "@/components/student-portal/student-portal-inactive-membership";
import { StudentPortalLoginScreen } from "@/components/student-portal/student-portal-login-screen";
import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";
import { StudentPortalUnlinkedProfile } from "@/components/student-portal/student-portal-unlinked-profile";
import { hasAcceptedCurrentStudentAgreements } from "@/lib/student-portal-agreements.server";
import { resolveStudentPortalClubContext } from "@/lib/student-portal-club.server";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
import { STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE } from "@/lib/student-portal-auth.shared";
import {
  studentPortalAgreementsPath,
  studentPortalPath,
} from "@/lib/student-portal-routing.shared";

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
        <AppHeader pageTitle="My Portal" clubName={null} />

        <StudentPortalHomeLink />

        <StudentPortalLoginScreen />
      </main>
    );
  }

  if (session.status === "unlinked") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="My Portal" clubName={null} />

        <StudentPortalHomeLink />

        <StudentPortalUnlinkedProfile />
      </main>
    );
  }

  if (session.status === "membership_inactive") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="My Portal" clubName={null} />

        <StudentPortalHomeLink />

        <StudentPortalInactiveMembership membershipStatus={session.membershipStatus} />
      </main>
    );
  }

  if (session.status === "no_student_access") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="My Portal" clubName={null} />

        <StudentPortalHomeLink />

        <StudentPortalAccessDenied message={STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE} />
      </main>
    );
  }

  const { profile } = session;
  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    profile.userId,
    { logContext: "StudentPortalEntryPage.guard" },
  );

  if (!agreementsComplete) {
    redirect(studentPortalAgreementsPath());
  }

  const clubContext = await resolveStudentPortalClubContext(profile.userId);

  if (clubContext.accessibleClubs.length === 1 && clubContext.accessibleClubs[0]) {
    redirect(studentPortalPath(clubContext.accessibleClubs[0].slug, profile.userId));
  }

  if (clubContext.requiresAcademySelection || clubContext.accessibleClubs.length > 1) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="My Portal" clubName={null} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StudentPortalHomeLink />
          <StudentPortalSignOutButton />
        </div>

        <section className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3">
          <p className="text-sm text-dojo-muted">
            Signed in as{" "}
            <span className="font-semibold text-dojo-white">{profile.fullName}</span>
          </p>
        </section>

        <StudentPortalAcademySelector
          clubs={clubContext.accessibleClubs}
          userId={profile.userId}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="My Portal" clubName={null} />

      <StudentPortalHomeLink />

      <StudentPortalAccessDenied message={STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE} />
    </main>
  );
}
