import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessLoginScreen } from "@/components/admin/admin-access-login-screen";
import { resolvePostAdminLoginRedirect } from "@/lib/admin-auth.server";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";
import { signInSuperAdminLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Super Admin Access",
  description: "Platform super admin sign-in.",
  robots: { index: false, follow: false },
};

interface SuperAdminLoginPageProps {
  searchParams: { denied?: string };
}

export default async function SuperAdminLoginPage({
  searchParams,
}: SuperAdminLoginPageProps) {
  const authUser = await getSupabaseAuthSessionUser();

  if (authUser) {
    const destination = await resolvePostAdminLoginRedirect(authUser.id, {
      intent: "super_admin",
    });

    if (destination) {
      redirect(destination);
    }
  }

  return (
    <AdminAccessLoginScreen
      heading="Super Admin Access"
      loginIntent="super_admin"
      showDeniedMessage={searchParams.denied === "1"}
      signInAction={signInSuperAdminLoginAction}
    />
  );
}
