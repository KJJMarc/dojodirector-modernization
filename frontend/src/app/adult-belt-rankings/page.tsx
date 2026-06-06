import type { Metadata } from "next";
import { AdultBeltRankingsView } from "@/components/public/adult-belt-rankings-view";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { getAdultBeltRankingsPageData } from "@/lib/adult-belt-rankings.server";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { publicAcademyDocumentTitle } from "@/lib/public-academy-branding.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: publicAcademyDocumentTitle(ACTIVE_CLUB_NAME, "Adult Belt Rankings"),
  description: `Current adult belt rankings at ${ACTIVE_CLUB_NAME}, updated automatically from academy grading records.`,
};

export default async function AdultBeltRankingsPage() {
  const pageData = await getAdultBeltRankingsPageData();

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
