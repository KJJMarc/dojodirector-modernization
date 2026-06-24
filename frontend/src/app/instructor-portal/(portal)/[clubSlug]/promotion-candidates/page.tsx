import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceRegisterBackLink } from "@/components/attendance/attendance-register-back-link";
import { InstructorKidsPromotionCandidatesView } from "@/components/instructor/instructor-kids-promotion-candidates-view";
import { AppHeader } from "@/components/layout/app-header";
import { loadKidsPromotionCandidatesOnRegisters } from "@/lib/admin-kids-promotion-registers.server";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
} from "@/lib/attendance-register-navigation.shared";
import {
  isInstructorKidsPromotionCandidatesClub,
  prioritizeTodayKidsPromotionRegisterDateGroups,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";

export const dynamic = "force-dynamic";

interface InstructorKidsPromotionCandidatesPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: InstructorKidsPromotionCandidatesPageProps): Promise<Metadata> {
  if (!isInstructorKidsPromotionCandidatesClub(params.clubSlug)) {
    return {
      title: "Dojo Director | Instructor Portal",
    };
  }

  const { club } = await requireInstructorPortalPageContext(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Promotion Candidates`,
    description: `View and promote junior candidates by class session at ${club.name}.`,
  };
}

export default async function InstructorKidsPromotionCandidatesPage({
  params,
}: InstructorKidsPromotionCandidatesPageProps) {
  if (!isInstructorKidsPromotionCandidatesClub(params.clubSlug)) {
    notFound();
  }

  const { club } = await requireInstructorPortalPageContext(params.clubSlug);
  const data = await loadKidsPromotionCandidatesOnRegisters(
    club.id,
    club.slug,
    club.name,
  );
  const navContext = {
    from: ATTENDANCE_REGISTER_NAV_FROM.instructorPortal,
    clubSlug: club.slug,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Promotion Candidates" clubName={club.name} />

      <AttendanceRegisterBackLink context={navContext} />

      <InstructorKidsPromotionCandidatesView
        data={{
          ...data,
          dateGroups: prioritizeTodayKidsPromotionRegisterDateGroups(data.dateGroups),
        }}
      />
    </main>
  );
}
