import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JuniorBeltRankingsView } from "@/components/public/junior-belt-rankings-view";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import { KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG } from "@/lib/clubs.shared";
import { getJuniorBeltRankingsPageData } from "@/lib/junior-belt-rankings.server";
import { publicAcademyDocumentTitle } from "@/lib/public-academy-branding.shared";

export const dynamic = "force-dynamic";

interface JuniorBeltRankingsPageProps {
  params: Promise<{ clubSlug: string }>;
}

export async function generateMetadata({
  params,
}: JuniorBeltRankingsPageProps): Promise<Metadata> {
  const { clubSlug } = await params;
  const club = await requireClubBySlug(clubSlug).catch(() => null);

  if (!club || club.slug !== KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG) {
    return {
      title: "Junior Belt Rankings",
    };
  }

  return {
    title: publicAcademyDocumentTitle(club.name, "Junior Belt Rankings"),
    description: `Current junior belt rankings at ${club.name}, updated automatically from academy grading records.`,
  };
}

export default async function JuniorBeltRankingsPage({
  params,
}: JuniorBeltRankingsPageProps) {
  const { clubSlug } = await params;
  const club = await requireClubBySlug(clubSlug);

  if (club.slug !== KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG) {
    notFound();
  }

  const pageData = await getJuniorBeltRankingsPageData(club.id, club.name);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 pb-16 sm:px-6 sm:py-10">
      <PublicAcademyPageHeader
        pageTitle="Junior Belt Rankings"
        clubName={pageData.clubName}
      />
      <div className="mt-8">
        <JuniorBeltRankingsView pageData={pageData} />
      </div>
    </main>
  );
}
