import type { Metadata } from "next";
import Link from "next/link";
import { AdminMfaSecurityPanel } from "@/components/admin/admin-mfa-security-panel";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { loadAdminMfaSecurityState } from "@/lib/admin-mfa-security.actions";
import { clubAdminSecurityPath } from "@/lib/admin-mfa.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

export const dynamic = "force-dynamic";

interface ClubAdminSecurityPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubAdminSecurityPageProps): Promise<Metadata> {
  const { club } = await requireAdminAccessForClubSlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Security`,
    description: `Security settings for ${club.name} admin access.`,
    robots: { index: false, follow: false },
  };
}

export default async function ClubAdminSecurityPage({
  params,
}: ClubAdminSecurityPageProps) {
  const { club } = await requireAdminAccessForClubSlug(params.clubSlug);
  const { enabled } = await loadAdminMfaSecurityState();
  const securityPath = clubAdminSecurityPath(club.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Security" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug)}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to dashboard
      </Link>

      <AdminMfaSecurityPanel enabled={enabled} revalidatePathname={securityPath} />
    </main>
  );
}
