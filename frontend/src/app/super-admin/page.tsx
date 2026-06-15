import type { Metadata } from "next";
import Link from "next/link";
import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";
import { SuperAdminClubList } from "@/components/admin/super-admin-club-list";
import { AppHeader } from "@/components/layout/app-header";
import { requireSuperAdminAccess } from "@/lib/admin-auth.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { listClubs } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Super Admin",
  description: "Super admin dashboard for managing clubs.",
};

export default async function SuperAdminPage() {
  await requireSuperAdminAccess();
  const clubs = await listClubs();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <div className="flex justify-end">
        <AdminSignOutButton clubSlug={KINGSTON_CLUB_SLUG} />
      </div>

      <AppHeader pageTitle="Super Admin" clubName="Platform" />

      <p className="text-sm text-dojo-muted">
        Select a club to open its admin dashboard. Multi-club management is rolling out
        in phases — existing Kingston admin tools remain available.
      </p>

      <SuperAdminClubList clubs={clubs} />

      <Link
        href="/admin"
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Legacy admin dashboard
      </Link>
    </main>
  );
}
