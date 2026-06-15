import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { BeltEditForm } from "@/components/admin/belt-edit-form";
import { AppHeader } from "@/components/layout/app-header";
import { getBeltLevelEditPageData } from "@/lib/admin-belt-management.server";
import { clubBeltManagementAdminPath } from "@/lib/admin-belt-systems.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface BeltEditPageProps {
  params: { clubSlug: string; beltId: string };
}

export async function generateMetadata({
  params,
}: BeltEditPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  try {
    const belt = await getBeltLevelEditPageData(club.id, params.beltId);

    return {
      title: `Dojo Director | ${club.name} Edit ${belt.name}`,
      description: `Edit belt settings for ${belt.name} at ${club.name}.`,
    };
  } catch {
    return {
      title: `Dojo Director | ${club.name} Edit Belt`,
      description: `Edit belt settings for ${club.name}.`,
    };
  }
}

export default async function BeltEditPage({ params }: BeltEditPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  let belt;

  try {
    belt = await getBeltLevelEditPageData(club.id, params.beltId);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Edit Belt" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link
          href={clubBeltManagementAdminPath(club.slug)}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Belt Management
        </Link>
      </AdminNavLinks>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          {belt.name}
        </h2>
        <p className="text-xs text-dojo-muted">
          Update belt details and promotion requirements for {belt.beltSystemName}.
        </p>
      </section>

      <BeltEditForm clubSlug={club.slug} belt={belt} />
    </main>
  );
}
