import type { Metadata } from "next";
import Link from "next/link";
import { AcademyMessagingTool } from "@/components/admin/academy-messaging-tool";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AppHeader } from "@/components/layout/app-header";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface MessageStudentsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: MessageStudentsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Message Students`,
    description: `Send student portal messages for ${club.name}.`,
  };
}

export default async function MessageStudentsPage({ params }: MessageStudentsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Message Students" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "messaging")} className={adminNavLinkClassName}>
          ← Back to Messaging
        </Link>
      </AdminNavLinks>

      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <AcademyMessagingTool
          clubSlug={club.slug}
          recipientType="students"
          title="Message students"
          description="Send messages to Student Portal users."
        />
      </section>
    </main>
  );
}
