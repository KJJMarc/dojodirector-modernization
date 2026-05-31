import { redirect } from "next/navigation";
import { hasAcceptedCurrentStudentAgreements } from "@/lib/student-portal-agreements.server";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";
import { isStudentPortalDevPickerEnabled } from "@/lib/student-portal-auth.shared";

interface StudentPortalUserLayoutProps {
  children: React.ReactNode;
  params: { userId: string };
}

export default async function StudentPortalUserLayout({
  children,
  params,
}: StudentPortalUserLayoutProps) {
  if (isStudentPortalDevPickerEnabled()) {
    return children;
  }

  const session = await resolveStudentPortalSessionState();

  if (session.status !== "authenticated") {
    redirect("/student-portal");
  }

  const profile = session.profile;

  if (profile.userId !== params.userId) {
    redirect(`/student-portal/${profile.userId}`);
  }

  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(
    profile.userId,
    { logContext: "StudentPortalUserLayout.guard" },
  );

  if (!agreementsComplete) {
    redirect("/student-portal/agreements");
  }

  return children;
}
