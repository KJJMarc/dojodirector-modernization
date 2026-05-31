import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalLoginScreen } from "@/components/student-portal/student-portal-login-screen";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Student Login",
  description: "Sign in to the member portal.",
};

export default async function StudentPortalLoginPage() {
  const session = await resolveStudentPortalSessionState();

  if (session.status === "authenticated") {
    redirect("/student-portal");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Student Login" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalHomeLink />

      <StudentPortalLoginScreen />
    </main>
  );
}
