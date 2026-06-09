import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { PortalAccessManager } from "@/components/admin/portal-access-manager";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { getPortalAccessBulkCounts } from "@/lib/portal-access.server";

export const dynamic = "force-dynamic";

interface PortalAccessPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: PortalAccessPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Portal Access`,
    description: `Portal access setup emails for ${club.name}.`,
  };
}

export default async function PortalAccessPage({ params }: PortalAccessPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  await requireAdminAccessForClubSlug(params.clubSlug);

  const bulkCounts = await getPortalAccessBulkCounts(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Portal Access" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "messaging")} className={adminNavLinkClassName}>
          ← Back to Messaging
        </Link>
      </AdminNavLinks>

      <PortalAccessManager clubSlug={club.slug} bulkCounts={bulkCounts} />
    </main>
  );
}
