import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalLoginScreen } from "@/components/student-portal/student-portal-login-screen";
import { resolveStudentPortalSessionState } from "@/lib/student-portal-auth.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Student Login",
  description: "Sign in to the member portal.",
};

interface StudentPortalLoginPageProps {
  searchParams: { reset?: string; setup?: string };
}

export default async function StudentPortalLoginPage({
  searchParams,
}: StudentPortalLoginPageProps) {
  const session = await resolveStudentPortalSessionState();

  if (session.status !== "signed_out" && session.status !== "unlinked") {
    redirect("/student-portal");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Student Login" clubName={null} />

      <StudentPortalHomeLink />

      <StudentPortalLoginScreen
        showResetSuccessMessage={searchParams.reset === "success"}
        showSetupSuccessMessage={searchParams.setup === "success"}
      />
    </main>
  );
}
