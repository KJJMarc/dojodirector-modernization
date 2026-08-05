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

/**
 * Public class timetable. Schedule times are academy-local wall clocks from
 * recurring_class_schedules (see getClubIanaTimeZone). They are formatted as stored —
 * never shifted to the visitor's browser timezone or a fixed UK clock.
 */
export default async function ClubTimetablePage({ params }: ClubTimetablePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const venues = await loadPublicTimetableVenuesForClub(club.id);

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 [color-scheme:light]">
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 bg-white px-3 py-4 pb-10 sm:px-5">
        <PublicAcademyPageHeader
          pageTitle="Class Timetable"
          clubName={club.name}
          tone="light"
        />
        <PublicAcademyTimetable academyName={club.name} venues={venues} />
      </main>
      <PublicSiteFooter variant="academy" />
    </div>
  );
}
