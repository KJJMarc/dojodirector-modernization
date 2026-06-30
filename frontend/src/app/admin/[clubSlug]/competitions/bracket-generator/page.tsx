import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { CompetitionBracketGeneratorView } from "@/components/admin/competition-bracket-generator-view";
import { AppHeader } from "@/components/layout/app-header";
import { isCompetitionBracketGeneratorClub } from "@/lib/admin-competition-bracket.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface CompetitionBracketGeneratorPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: CompetitionBracketGeneratorPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Bracket Generator`,
    description: `Generate printable knockout tournament brackets for ${club.name}.`,
  };
}

export default async function CompetitionBracketGeneratorPage({
  params,
}: CompetitionBracketGeneratorPageProps) {
  if (!isCompetitionBracketGeneratorClub(params.clubSlug)) {
    notFound();
  }

  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader
        pageTitle="Competition Bracket Generator"
        clubName={club.name}
      />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <CompetitionBracketGeneratorView clubSlug={club.slug} />
    </main>
  );
}
