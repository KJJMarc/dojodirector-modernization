import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessLoginForm } from "@/components/admin/admin-access-login-form";
import { PRODUCT_NAME } from "@/lib/branding";
import { ADMIN_ACCESS_DENIED_MESSAGE } from "@/lib/admin-auth.shared";
import { resolvePostAdminLoginRedirect } from "@/lib/admin-auth.server";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";
import { requireClubBySlug } from "@/lib/clubs.server";

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
    const destination = await resolvePostAdminLoginRedirect(authUser.id, club.slug);

    if (destination) {
      redirect(destination);
    }
  }

  const showDeniedMessage = searchParams.denied === "1";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-6 shadow-lg shadow-black/30 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dojo-red">
          {PRODUCT_NAME}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-dojo-white">Admin Access</h1>
        <p className="mt-2 text-sm text-dojo-muted">{club.name}</p>

        {showDeniedMessage ? (
          <p className="mt-4 rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
            {ADMIN_ACCESS_DENIED_MESSAGE}
          </p>
        ) : null}

        <div className="mt-6">
          <AdminAccessLoginForm clubSlug={club.slug} />
        </div>
      </div>
    </main>
  );
}
