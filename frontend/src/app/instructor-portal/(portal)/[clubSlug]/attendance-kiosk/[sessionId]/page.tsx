import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceKioskScreen } from "@/components/attendance-kiosk/attendance-kiosk-screen";
import { loadAttendanceKioskPageData } from "@/lib/attendance-kiosk.server";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";

export const dynamic = "force-dynamic";

interface AttendanceKioskPageProps {
  params: { clubSlug: string; sessionId: string };
}

export async function generateMetadata({
  params,
}: AttendanceKioskPageProps): Promise<Metadata> {
  const { club } = await requireInstructorPortalPageContext(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Attendance Kiosk`,
    description: `Self check-in kiosk for ${club.name} class sessions.`,
  };
}

export default async function AttendanceKioskPage({
  params,
}: AttendanceKioskPageProps) {
  const { club } = await requireInstructorPortalPageContext(params.clubSlug);
  const pageData = await loadAttendanceKioskPageData(
    club.id,
    club.slug,
    club.name,
    params.sessionId,
  );

  if (!pageData) {
    notFound();
  }

  return (
    <AttendanceKioskScreen
      clubSlug={pageData.clubSlug}
      sessionId={pageData.sessionId}
      clubName={pageData.clubName}
      className={pageData.className}
      timeLabel={pageData.timeLabel}
      locationLabel={pageData.locationLabel}
      markingDisabled={pageData.markingDisabled}
      students={pageData.students}
    />
  );
}
