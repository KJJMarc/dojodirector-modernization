import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalAgreementForm } from "@/components/student-portal/student-portal-agreement-form";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";
import { toClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import { resolveMemberPortalAgreementContent } from "@/lib/club-agreement-templates.server";
import {
  hasAcceptedCurrentStudentAgreements,
} from "@/lib/student-portal-agreements.server";
import {
  resolveStudentPortalAgreementClubForUser,
  resolveStudentPortalHomePath,
} from "@/lib/student-portal-club.server";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
import { STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE } from "@/lib/student-portal-auth.shared";
import { StudentPortalAccessDenied } from "@/components/student-portal/student-portal-access-denied";
import { StudentPortalInactiveMembership } from "@/components/student-portal/student-portal-inactive-membership";
import { StudentPortalUnlinkedProfile } from "@/components/student-portal/student-portal-unlinked-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Membership Agreement",
  description: "Accept the membership agreement for the student portal.",
};

export default async function StudentPortalAgreementsPage() {
  const session = await resolveStudentPortalSessionState();

  if (session.status === "signed_out") {
    redirect("/student-portal");
  }

  if (session.status === "unlinked") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Membership Agreement" clubName={null} />
        <StudentPortalHomeLink />
        <StudentPortalUnlinkedProfile />
      </main>
    );
  }

  if (session.status === "membership_inactive") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Membership Agreement" clubName={null} />
        <StudentPortalHomeLink />
        <StudentPortalInactiveMembership membershipStatus={session.membershipStatus} />
      </main>
    );
  }

  if (session.status === "no_student_access") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Membership Agreement" clubName={null} />
        <StudentPortalHomeLink />
        <StudentPortalAccessDenied message={STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE} />
      </main>
    );
  }

  const profile = session.profile;

  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    profile.userId,
    { logContext: "StudentPortalAgreementsPage.guard" },
  );

  if (agreementsComplete) {
    redirect(await resolveStudentPortalHomePath(profile.userId));
  }

  const agreementClub = await resolveStudentPortalAgreementClubForUser(profile.userId);

  if (!agreementClub) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Membership Agreement" clubName={null} />
        <StudentPortalHomeLink />
        <StudentPortalAccessDenied message={STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE} />
      </main>
    );
  }

  const agreementContent = toClientClubAgreementContent(
    await resolveMemberPortalAgreementContent(agreementClub.id),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Membership Agreement" clubName={agreementClub.name} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StudentPortalHomeLink />
        <StudentPortalSignOutButton />
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">{profile.fullName}</h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Accept the membership agreement before you can access your portal.
          </p>
        </div>

        <StudentPortalAgreementForm
          studentName={profile.fullName}
          clubName={agreementClub.name}
          agreementVersion={agreementContent.version}
          agreementSections={agreementContent.sections}
          agreementDisplayLabel={agreementContent.displayLabel}
        />
      </section>
    </main>
  );
}
