import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessLoginScreen } from "@/components/admin/admin-access-login-screen";
import {
  resolveAcademyAdminLoginDestination,
} from "@/lib/admin-auth.server";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";
import { signInAcademyAdminLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Admin Access",
  description: "Academy admin sign-in.",
  robots: { index: false, follow: false },
};

interface AdminLoginPageProps {
  searchParams: { denied?: string; reset?: string; setup?: string };
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const authUser = await getSupabaseAuthSessionUser();

  if (authUser) {
    const destination = await resolveAcademyAdminLoginDestination(authUser.id);

    if (destination) {
      redirect(destination);
    }
  }

  return (
    <AdminAccessLoginScreen
      heading="Admin Access"
      loginIntent="academy_admin"
      showDeniedMessage={searchParams.denied === "1"}
      showResetSuccessMessage={searchParams.reset === "success"}
      showSetupSuccessMessage={searchParams.setup === "success"}
      signInAction={signInAcademyAdminLoginAction}
    />
  );
}
