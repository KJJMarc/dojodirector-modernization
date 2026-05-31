import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";
import { requireSuperAdminAccess } from "@/lib/admin-auth.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminAccess();

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl justify-end px-3 pt-3 sm:px-5">
        <AdminSignOutButton clubSlug={KINGSTON_CLUB_SLUG} />
      </div>
      {children}
    </>
  );
}
