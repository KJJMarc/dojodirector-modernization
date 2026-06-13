import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JuniorBeltRankingsView } from "@/components/public/junior-belt-rankings-view";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { isJuniorBeltRankingsPublicPageSlug } from "@/lib/belt-rankings-clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
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

  if (!club || !isJuniorBeltRankingsPublicPageSlug(club.slug)) {
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

  if (!isJuniorBeltRankingsPublicPageSlug(club.slug)) {
    notFound();
  }

  const pageData = await getJuniorBeltRankingsPageData(
    club.id,
    club.name,
    club.slug,
  );

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
