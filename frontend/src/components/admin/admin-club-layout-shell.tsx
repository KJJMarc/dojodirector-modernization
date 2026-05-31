import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";

interface AdminClubLayoutShellProps {
  clubSlug: string;
  children: React.ReactNode;
}

export function AdminClubLayoutShell({
  clubSlug,
  children,
}: AdminClubLayoutShellProps) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl justify-end px-3 pt-3 sm:px-5">
        <AdminSignOutButton clubSlug={clubSlug} />
      </div>
      {children}
    </>
  );
}
