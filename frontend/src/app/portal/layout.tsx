import { redirect } from "next/navigation";
import { hasAcceptedCurrentStudentAgreements } from "@/lib/student-portal-agreements.server";
import { StudentPortalAccessDenied } from "@/components/student-portal/student-portal-access-denied";
import { StudentPortalInactiveMembership } from "@/components/student-portal/student-portal-inactive-membership";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
import { STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE } from "@/lib/student-portal-auth.shared";
import { isStudentPortalDevPickerEnabled } from "@/lib/student-portal-auth.shared";

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default async function PortalLayout({ children }: PortalLayoutProps) {
  if (isStudentPortalDevPickerEnabled()) {
    return children;
  }

  const session = await resolveStudentPortalSessionState();

  if (session.status !== "authenticated") {
    if (session.status === "membership_inactive") {
      return (
        <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
          <StudentPortalInactiveMembership membershipStatus={session.membershipStatus} />
        </main>
      );
    }

    if (session.status === "no_student_access") {
      return (
        <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
          <StudentPortalAccessDenied message={STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE} />
        </main>
      );
    }

    redirect("/student-portal");
  }

  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    session.profile.userId,
    { logContext: "PortalLayout.guard" },
  );

  if (!agreementsComplete) {
    redirect("/student-portal/agreements");
  }

  return children;
}
