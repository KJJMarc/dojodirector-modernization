import { AdminClubLayoutShell } from "@/components/admin/admin-club-layout-shell";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";

export const dynamic = "force-dynamic";

export default async function ClubAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clubSlug: string };
}) {
  const { club } = await requireAdminAccessForClubSlug(params.clubSlug);

  return <AdminClubLayoutShell clubSlug={club.slug}>{children}</AdminClubLayoutShell>;
}
