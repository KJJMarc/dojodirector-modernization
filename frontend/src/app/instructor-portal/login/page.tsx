import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { InstructorPortalLoginScreen } from "@/components/instructor-portal/instructor-portal-login-screen";
import { resolveInstructorPortalSessionState } from "@/lib/instructor-portal-auth.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Instructor Login",
  description: "Sign in to the instructor portal.",
};

interface InstructorPortalLoginPageProps {
  searchParams: { reset?: string; setup?: string };
}

export default async function InstructorPortalLoginPage({
  searchParams,
}: InstructorPortalLoginPageProps) {
  const session = await resolveInstructorPortalSessionState();

  if (session.status === "authenticated") {
    redirect("/instructor-portal");
  }

  return (
    <main className="portal-page-shell mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Instructor Login" clubName={null} />

      <InstructorPortalHomeLink />

      <InstructorPortalLoginScreen
        showResetSuccessMessage={searchParams.reset === "success"}
        showSetupSuccessMessage={searchParams.setup === "success"}
      />
    </main>
  );
}
