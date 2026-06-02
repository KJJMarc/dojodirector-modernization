import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalAccessDenied } from "@/components/student-portal/student-portal-access-denied";
import { StudentPortalInactiveMembership } from "@/components/student-portal/student-portal-inactive-membership";
import { StudentPortalTopBar } from "@/components/student-portal/student-portal-top-bar";
import { getClubBySlug } from "@/lib/clubs.server";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
import {
  isStudentPortalDevPickerEnabled,
  STUDENT_PORTAL_CLUB_ACCESS_DENIED_MESSAGE,
  STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE,
} from "@/lib/student-portal-auth.shared";
import { hasAcceptedCurrentStudentAgreements } from "@/lib/student-portal-agreements.server";
import {
  userCanAccessStudentPortalClub,
} from "@/lib/student-portal-club.server";
import {
  getStudentPortalUiConfig,
  studentPortalAgreementsPath,
  studentPortalPath,
} from "@/lib/student-portal-routing.shared";

interface StudentPortalUserLayoutProps {
  children: React.ReactNode;
  params: { clubSlug: string; userId: string };
}

function studentPortalGuardShell({
  pageTitle,
  clubName,
  content,
}: {
  pageTitle: string;
  clubName: string | null;
  content: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle={pageTitle} clubName={clubName} />
      <StudentPortalTopBar />
      {content}
    </main>
  );
}

export default async function StudentPortalUserLayout({
  children,
  params,
}: StudentPortalUserLayoutProps) {
  if (isStudentPortalDevPickerEnabled()) {
    return children;
  }

  const session = await resolveStudentPortalSessionState();

  if (session.status === "signed_out" || session.status === "unlinked") {
    redirect("/student-portal/login");
  }

  if (session.status === "no_student_access") {
    return studentPortalGuardShell({
      pageTitle: "My Portal",
      clubName: null,
      content: (
        <StudentPortalAccessDenied message={STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE} />
      ),
    });
  }

  if (session.status === "membership_inactive") {
    return studentPortalGuardShell({
      pageTitle: "My Portal",
      clubName: null,
      content: (
        <StudentPortalInactiveMembership membershipStatus={session.membershipStatus} />
      ),
    });
  }

  const profile = session.profile;

  if (profile.userId !== params.userId) {
    redirect(studentPortalPath(params.clubSlug, profile.userId));
  }

  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    profile.userId,
    { logContext: "StudentPortalUserLayout.guard" },
  );

  if (!agreementsComplete) {
    redirect(studentPortalAgreementsPath());
  }

  const club = await getClubBySlug(params.clubSlug);
  const uiConfig = club
    ? getStudentPortalUiConfig(club.slug, club.name)
    : null;
  const clubName = uiConfig?.clubDisplayName ?? club?.name ?? null;

  const canAccessClub = await userCanAccessStudentPortalClub(
    profile.userId,
    params.clubSlug,
  );

  if (!canAccessClub) {
    return studentPortalGuardShell({
      pageTitle: "My Portal",
      clubName,
      content: (
        <StudentPortalAccessDenied
          clubName={clubName}
          message={STUDENT_PORTAL_CLUB_ACCESS_DENIED_MESSAGE}
        />
      ),
    });
  }

  return children;
}
