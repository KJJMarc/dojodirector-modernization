import type { Metadata } from "next";
import Link from "next/link";
import { AdminMfaSecurityPanel } from "@/components/admin/admin-mfa-security-panel";
import { AppHeader } from "@/components/layout/app-header";
import { requireSuperAdminAccess } from "@/lib/admin-auth.server";
import { SUPER_ADMIN_PATH } from "@/lib/admin-auth.shared";
import { loadAdminMfaSecurityState } from "@/lib/admin-mfa-security.actions";
import { SUPER_ADMIN_SECURITY_PATH } from "@/lib/admin-mfa.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Super Admin Security",
  description: "Security settings for platform super admin access.",
  robots: { index: false, follow: false },
};

export default async function SuperAdminSecurityPage() {
  await requireSuperAdminAccess();
  const { enabled } = await loadAdminMfaSecurityState();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Security" clubName="Platform" />

      <Link
        href={SUPER_ADMIN_PATH}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to super admin
      </Link>

      <AdminMfaSecurityPanel
        enabled={enabled}
        revalidatePathname={SUPER_ADMIN_SECURITY_PATH}
      />
    </main>
  );
}
