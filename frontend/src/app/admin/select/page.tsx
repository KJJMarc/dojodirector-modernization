import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAcademySelectList } from "@/components/admin/admin-academy-select-list";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { requireAcademyAdminSelectionAccess } from "@/lib/admin-auth.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Select Academy",
  description: "Choose which academy you want to open.",
  robots: { index: false, follow: false },
};

export default async function AdminAcademySelectPage() {
  const academies = await requireAcademyAdminSelectionAccess();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-8 sm:px-5">
      <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
      <h1 className="mt-3 text-2xl font-semibold text-dojo-white">Select Academy</h1>
      <p className="mt-2 text-sm text-dojo-muted">
        Choose which academy you want to open. You will be taken to the admin dashboard,
        instructor portal, or member portal for that academy based on your access.
      </p>

      <div className="mt-8">
        <AdminAcademySelectList academies={academies} />
      </div>
    </main>
  );
}
