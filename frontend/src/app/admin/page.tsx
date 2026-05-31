import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Admin",
  description: "Dojo Director admin dashboard.",
};

export default async function AdminPage() {
  const { club } = await requireAdminAccessForClubSlug(KINGSTON_CLUB_SLUG);
  redirect(`/admin/${club.slug}`);
}
