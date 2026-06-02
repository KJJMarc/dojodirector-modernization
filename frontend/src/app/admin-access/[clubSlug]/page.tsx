import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessLoginScreen } from "@/components/admin/admin-access-login-screen";
import { resolvePostAdminLoginRedirect } from "@/lib/admin-auth.server";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";
import { requireClubBySlug } from "@/lib/clubs.server";
import { signInAdminAccessAction } from "./actions";

export const dynamic = "force-dynamic";

interface AdminAccessPageProps {
  params: { clubSlug: string };
  searchParams: { denied?: string };
}

export async function generateMetadata({
  params,
}: AdminAccessPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Admin Access`,
    description: `Admin sign-in for ${club.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminAccessPage({
  params,
  searchParams,
}: AdminAccessPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const authUser = await getSupabaseAuthSessionUser();

  if (authUser) {
    const destination = await resolvePostAdminLoginRedirect(authUser.id, {
      intent: "legacy_club",
      clubSlug: club.slug,
    });

    if (destination) {
      redirect(destination);
    }
  }

  return (
    <AdminAccessLoginScreen
      heading="Admin Access"
      loginIntent="legacy_club"
      clubSlug={club.slug}
      showDeniedMessage={searchParams.denied === "1"}
      signInAction={signInAdminAccessAction}
    />
  );
}
