import { redirect } from "next/navigation";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAdminClassesPageProps {
  params: { clubSlug: string };
}

/** Legacy hub route — Manage Classes now opens Edit / Update Classes directly. */
export default async function ClubAdminClassesPage({
  params,
}: ClubAdminClassesPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  redirect(clubAdminPath(club.slug, "classes/edit"));
}
