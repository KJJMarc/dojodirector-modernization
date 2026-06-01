import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clubBeltManagementAdminPath } from "@/lib/admin-belt-systems.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface BeltRedirectPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: BeltRedirectPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Belt Management`,
    description: `Manage belt systems for ${club.name}.`,
  };
}

export default async function BeltRedirectPage({ params }: BeltRedirectPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  redirect(clubBeltManagementAdminPath(club.slug));
}
