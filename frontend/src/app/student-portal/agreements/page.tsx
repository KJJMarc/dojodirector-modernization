import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalAgreementForm } from "@/components/student-portal/student-portal-agreement-form";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";
import { ACTIVE_CLUB_ID, ACTIVE_CLUB_NAME } from "@/lib/branding";
import { toClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import { resolveMemberPortalAgreementContent } from "@/lib/club-agreement-templates.server";
import {
  hasAcceptedCurrentStudentAgreements,
} from "@/lib/student-portal-agreements.server";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
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
        <AppHeader pageTitle="Membership Agreement" clubName={ACTIVE_CLUB_NAME} />
        <StudentPortalHomeLink />
        <StudentPortalUnlinkedProfile />
      </main>
    );
  }

  const profile = session.profile;

  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    profile.userId,
    { logContext: "StudentPortalAgreementsPage.guard" },
  );

  if (agreementsComplete) {
    redirect("/student-portal");
  }

  const agreementContent = toClientClubAgreementContent(
    await resolveMemberPortalAgreementContent(ACTIVE_CLUB_ID),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Membership Agreement" clubName={ACTIVE_CLUB_NAME} />

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
          agreementVersion={agreementContent.version}
          agreementSections={agreementContent.sections}
          agreementDisplayLabel={agreementContent.displayLabel}
        />
      </section>
    </main>
  );
}
