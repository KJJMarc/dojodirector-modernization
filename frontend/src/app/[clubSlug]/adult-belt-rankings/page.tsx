import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdultBeltRankingsView } from "@/components/public/adult-belt-rankings-view";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { isAdultBeltRankingsPublicPageSlug } from "@/lib/belt-rankings-clubs.shared";
import { getAdultBeltRankingsPageData } from "@/lib/adult-belt-rankings.server";
import { requireClubBySlug } from "@/lib/clubs.server";
import { publicAcademyDocumentTitle } from "@/lib/public-academy-branding.shared";

export const dynamic = "force-dynamic";

interface AdultBeltRankingsClubPageProps {
  params: Promise<{ clubSlug: string }>;
}

export async function generateMetadata({
  params,
}: AdultBeltRankingsClubPageProps): Promise<Metadata> {
  const { clubSlug } = await params;
  const club = await requireClubBySlug(clubSlug).catch(() => null);

  if (!club || !isAdultBeltRankingsPublicPageSlug(club.slug)) {
    return {
      title: "Adult Belt Rankings",
    };
  }

  return {
    title: publicAcademyDocumentTitle(club.name, "Adult Belt Rankings"),
    description: `Current adult belt rankings at ${club.name}, updated automatically from academy grading records.`,
  };
}

export default async function AdultBeltRankingsClubPage({
  params,
}: AdultBeltRankingsClubPageProps) {
  const { clubSlug } = await params;
  const club = await requireClubBySlug(clubSlug);

  if (!isAdultBeltRankingsPublicPageSlug(club.slug)) {
    notFound();
  }

  const pageData = await getAdultBeltRankingsPageData(club.id, club.name);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 pb-16 sm:px-6 sm:py-10">
      <PublicAcademyPageHeader
        pageTitle="Adult Belt Rankings"
        clubName={pageData.clubName}
      />
      <div className="mt-8">
        <AdultBeltRankingsView pageData={pageData} />
      </div>
    </main>
  );
}
