import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { PublicAcademyTimetable } from "@/components/public/public-academy-timetable";
import { requireClubBySlug } from "@/lib/clubs.server";
import { publicAcademyDocumentTitle } from "@/lib/public-academy-branding.shared";
import { loadPublicTimetableVenuesForClub } from "@/lib/public-timetable.server";

export const dynamic = "force-dynamic";

interface ClubTimetablePageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubTimetablePageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: publicAcademyDocumentTitle(club.name, "Class Timetable"),
    description: `Weekly class timetable for ${club.name}. View class names, days and times by venue.`,
  };
}

export default async function ClubTimetablePage({ params }: ClubTimetablePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const venues = await loadPublicTimetableVenuesForClub(club.id);

  return (
    <div className="flex min-h-screen flex-col bg-dojo-black">
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-3 py-4 pb-10 sm:px-5">
        <PublicAcademyPageHeader
          pageTitle="Class Timetable"
          clubName={club.name}
        />
        <PublicAcademyTimetable academyName={club.name} venues={venues} />
      </main>
      <PublicSiteFooter variant="academy" />
    </div>
  );
}
