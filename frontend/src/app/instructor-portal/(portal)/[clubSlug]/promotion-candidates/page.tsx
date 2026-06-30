import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceRegisterBackLink } from "@/components/attendance/attendance-register-back-link";
import { InstructorKidsPromotionCandidatesView } from "@/components/instructor/instructor-kids-promotion-candidates-view";
import { InstructorKidsPromotionDateSearchForm } from "@/components/instructor/instructor-kids-promotion-date-search-form";
import { AppHeader } from "@/components/layout/app-header";
import { loadKidsPromotionCandidatesOnRegisters } from "@/lib/admin-kids-promotion-registers.server";
import { formatAttendanceScheduleFilterHeading } from "@/lib/attendance-schedule";
import {
  ATTENDANCE_REGISTER_NAV_FROM,
} from "@/lib/attendance-register-navigation.shared";
import {
  isInstructorKidsPromotionCandidatesClub,
  resolveInstructorKidsPromotionScheduleFilter,
  resolveInstructorKidsPromotionSelectedDateKey,
  type InstructorKidsPromotionCandidatesSearchParams,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface InstructorKidsPromotionCandidatesPageProps {
  params: { clubSlug: string };
  searchParams: InstructorKidsPromotionCandidatesSearchParams;
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
  searchParams,
}: InstructorKidsPromotionCandidatesPageProps) {
  if (!isInstructorKidsPromotionCandidatesClub(params.clubSlug)) {
    notFound();
  }

  const { club } = await requireInstructorPortalPageContext(params.clubSlug);
  const selectedDateKey = resolveInstructorKidsPromotionSelectedDateKey(searchParams);
  const scheduleFilter = resolveInstructorKidsPromotionScheduleFilter(searchParams);
  const filterHeading = formatAttendanceScheduleFilterHeading(scheduleFilter);
  const data = await loadKidsPromotionCandidatesOnRegisters(
    club.id,
    club.slug,
    club.name,
    scheduleFilter,
    {
      promotionScope: "session-attendees",
      attendeesMode: "lazy",
      ensureRecurringSessions: true,
    },
  );
  const navContext = {
    from: ATTENDANCE_REGISTER_NAV_FROM.instructorPortal,
    clubSlug: club.slug,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Promotion Candidates" clubName={club.name} />

      <AttendanceRegisterBackLink context={navContext} />

      <InstructorKidsPromotionDateSearchForm
        key={selectedDateKey}
        clubSlug={club.slug}
        selectedDateKey={selectedDateKey}
        filterHeading={filterHeading}
      />

      <InstructorKidsPromotionCandidatesView
        key={selectedDateKey}
        data={data}
        selectedDateKey={selectedDateKey}
      />
    </main>
  );
}
